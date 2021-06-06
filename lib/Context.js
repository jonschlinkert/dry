'use strict';

const set = require('set-value');
const get = require('expand-value');

const Dry = require('./Dry');
const StrainerFactory = require('./StrainerFactory');
const ResourceLimits = require('./ResourceLimits');
const utils = require('./utils');

const kStrainer = Symbol(':strainer');
const kWarnings = Symbol(':warnings');
const MAX_DEPTH = 100;

const {
  ContextError,
  InternalError,
  StackLevelError,
  UndefinedVariable
} = require('./errors');

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

const handlers = {
  set(target, prop, value) {
    return prop in target ? ((target[prop] = value), true) : target.set(prop, value);
  },
  get(target, prop) {
    return prop in target ? target[prop] : target.get(prop);
  },
  has(target, prop) {
    return prop in target ? true : target.has(prop);
  },
  ownKeys(target) {
    return target.keys();
  },
  deleteProperty(target, prop) {
    if (prop in target) {
      delete target[prop];
      return true;
    }
    return target.delete(prop);
  }
};

const resource_limits = (options = {}) => {
  return options.resource_limits || new ResourceLimits(Dry.Template.default_resource_limits);
};

class Context {
  static build(
    environments = {},
    outer_scope = {},
    registers = new Map(),
    rethrow_errors = false,
    resource_limits = null,
    static_environments = {},
    block
  ) {
    return new this({ environments, outer_scope, registers, rethrow_errors, resource_limits, static_environments }, block);
  }

  constructor(options = {}, block) {
    const {
      environments = {},
      outer_scope = {},
      registers = new Map(),
      rethrow_errors = false,
      static_environments = {}
    } = options;

    this.environments = [environments].flat();
    this.static_environments = [static_environments].flat();
    this.scopes = [outer_scope || {}];
    this.registers = registers;
    this.errors = [];
    this.partial = false;
    this.strict_variables = false;
    this.resource_limits = resource_limits(options);
    this.base_scope_depth = 0;
    this.interrupts = [];
    this.filters = [];
    this.global_filter = null;
    this.disabled_tags = {};

    this.exception_renderer = Dry.Template.default_exception_renderer;
    if (rethrow_errors) {
      this.exception_renderer = e => { throw e; };
    }

    if (block) block(this);
    return new Proxy(this, handlers);
  }

  get(key) {
    return get(this.scope, key);
  }

  set(key, value) {
    set(this.scope, key, value);
    return true;
  }

  delete(key) {
    const segs = key.split('.');
    const prop = segs.pop();
    let scope = this.scope;

    if (segs.length > 0) {
      scope = this.get(segs.join('.'));
    }

    if (!(prop in scope)) {
      return false;
    }

    delete scope[prop];
    return true;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  key(key) {
    return this.has(key);
  }

  keys() {
    return Reflect.ownKeys(this.scope);
  }

  push(locals = {}) {
    this.scopes.push(locals);
  }

  // Merge local variables onto the current scope
  merge(locals) {
    Object.assign(this.scope, locals);
  }

  pop() {
    if (this.scopes.length === 1) {
      throw new ContextError();
    }
    this.scopes.pop();
  }

  invoke(method, ...args) {
    const output = this.strainer.invoke(method, ...args);
    return output && output.to_liquid ? output.to_liquid() : output;
  }

  // Adds filters to this context.
  //
  // Note that this does not register the filters with the main Template object.
  // see <tt>Template.register_filter</tt> for that
  //
  add_filters(...args) {
    const filters = [...args].flat().filter(Boolean);
    this.filters.push(...filters);
    this.strainer = null;
  }

  apply_global_filter(obj) {
    return this.global_filter ? this.global_filter(obj) : obj;
  }

  // push an interrupt to the stack. this interrupt is considered not handled.
  push_interrupt(e) {
    this.interrupts.push(e);
  }

  // pop an interrupt from the stack
  pop_interrupt() {
    return this.interrupts.pop();
  }

  stack(scope, block) {
    if (typeof scope === 'function') {
      block = scope;
      scope = this.new_isolated_subcontext();
    }

    try {
      this.push(scope);
      block(this.scope);
    } catch (err) {
      console.error(err);
      this.errors.push(err);
    } finally {
      this.pop();
    }
  }

  // Creates a new context inheriting resource limits, filters, environment etc.,
  // but with an isolated scope.
  new_isolated_subcontext() {
    this.check_overflow();

    const registers = new Map();

    for (const [key, value] of this.registers) {
      registers.set(key, value);
    }

    const subcontext = Context.build({
      resource_limits: this.resource_limits,
      static_environments: this.static_environments,
      registers
    });

    subcontext.base_scope_depth = this.base_scope_depth + 1;
    subcontext.exception_renderer = this.exception_renderer;
    subcontext.filters = this.filters;
    subcontext.strainer = null;
    subcontext.errors = this.errors;
    subcontext.warnings = this.warnings;
    subcontext.disabled_tags = this.disabled_tags;
    return subcontext;
  }

  clear_instance_assigns() {
    this.scopes[this.scopes.length - 1] = {};
  }

  hoist() {}
  lookup() {}
  resolve() {}

  evaluate(object) {
    const output = object && typeof object.evaluate === 'function' ? object.evaluate(this) : object;

    if (output == null && object && Array.isArray(object.name) && object.name.input) {
      return this[object.name.input];
    }

    if (utils.isPrimitive(output)) {
      return typeof output === 'symbol' ? utils.toString(output) : output;
    }

    return output;
  }

  // Fetches an object starting at the local scope and then moving up the hierachy
  find_variable(key, raise_on_not_found = true) {
    const k = Array.isArray(key) ? key[0] : key;
    const scope = this.scopes.find(s => hasOwnProperty.call(s, k));
    let variable = null;

    if (scope) {
      variable = this.lookup_and_evaluate(scope, k, { raise_on_not_found });
    } else {
      variable = this.try_variable_find_in_environments(k, { raise_on_not_found });
    }

    if (variable && variable.to_liquid) {
      variable = variable.to_liquid();
    }

    if (variable && variable.context) {
      variable.context = this;
    }

    return variable;
  }

  lookup_and_evaluate(scope, key, { raise_on_not_found = true } = {}) {
    const k = Array.isArray(key) ? key[0] : key;

    if (this.strict_variables && raise_on_not_found && scope && !hasOwnProperty.call(scope, k)) {
      throw new UndefinedVariable(`undefined variable ${k}`);
    }

    let value = scope[k];

    if (typeof value === 'function') {
      value = scope[k] = value(this);
    }

    return value;
  }

  with_disabled_tags(tag_names, block) {
    try {
      for (const name of tag_names) {
        this.disabled_tags[name] = (this.disabled_tags[name] || 0) + 1;
      }
      return block(this);
    } catch (err) {
      console.error(err);
      process.exit();
    } finally {
      for (const name of tag_names) {
        this.disabled_tags[name]--;
      }
    }
  }

  tag_disabled_(tag_name) {
    return (this.disabled_tags[tag_name] || 0) > 0;
  }

  try_variable_find_in_environments(key, { raise_on_not_found } = {}) {
    const k = Array.isArray(key) ? key[0] : key;

    for (const env of this.environments) {
      const found = this.lookup_and_evaluate(env, k, { raise_on_not_found });
      if (found != null || (this.strict_variables && raise_on_not_found)) {
        return found;
      }
    }

    for (const env of this.static_environments) {
      const found = this.lookup_and_evaluate(env, k, { raise_on_not_found });
      if (found != null || (this.strict_variables && raise_on_not_found)) {
        return found;
      }
    }

    return null;
  }

  check_overflow() {
    if (this.overflow()) {
      throw new StackLevelError('Nesting too deep');
    }
  }

  overflow() {
    return this.base_scope_depth + this.scopes.length > MAX_DEPTH;
  }

  internal_error(e) {
    return new InternalError(e && e.message || e || 'internal');
  }

  handle_error(e, { line_number = null } = {}) {
    if (!(e instanceof Error)) e = this.internal_error(e);
    e.template_name ||= this.template_name;
    e.line_number ||= line_number;
    this.errors.push(e);
    return this.exception_renderer(e).toString();
  }

  squash_instance_assigns_with_environments2() {
    const scope = this.scope;

    for (const k of Object.keys(scope)) {
      for (const env of this.environments) {
        if ((env.has && env.has(k)) || (isObject(env) && hasOwnProperty.call(env, k))) {
          scope[k] = this.lookup_and_evaluate(env, k);
          break;
        }
      }
    }
  }

  // are there any not-handled interrupts?
  get interrupt() {
    return this.interrupts.length > 0;
  }

  get scope() {
    return this.scopes[this.scopes.length - 1] || this.push({});
  }

  set warnings(value) {
    this[kWarnings] = value;
  }
  get warnings() {
    return (this[kWarnings] ||= []);
  }

  set strainer(value) {
    this[kStrainer] = value;
  }
  get strainer() {
    return (this[kStrainer] ||= StrainerFactory.create(this, this.filters));
  }
}

module.exports = Context;

// const context = new Context();

// context.closure({}, () => {

// });

// context.closure(() => {

// });

// console.log('---');
// context.foo = 'bar';
// console.log(context.has('foo'));
// console.log(context.has('bar'));
// console.log(context);
// console.log('---');
// context.a = 'b';
// context.set('c', 'd');
// console.log(context);
// console.log('---');

// delete context.foo;
// console.log(context);
// console.log('---');
// context.abc = 'xyz';
// console.log('abc' in context);
// console.log(context);
// console.log('---');
// context.scopes = [{}];
// console.log(context);

// // console.log(Object.keys(context));
// console.log(Reflect.ownKeys(context));
// console.log('---');
