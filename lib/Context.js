'use strict';

const set = require('set-value');
const get = require('get-value');
const expand = require('expand-value');
const Dry = require('./Dry');

const resolve = v => v && v.to_liquid ? v.to_liquid() : v;
const kStrainer = Symbol('strainer');
const MAX_DEPTH = 100;

const handlers = {
  set(target, key, value) {
    return key in target ? ((target[key] = value), true) : target.set(key, value);
  },
  get(target, key) {
    return key in target ? target[key] : target.get(key);
  },
  has(target, key) {
    return key in target ? true : target.has(key);
  },
  ownKeys(target) {
    return target.keys();
  },
  deleteProperty(target, key) {
    if (key in target) {
      delete target[key];
      return true;
    }
    return target.delete(key);
  }
};

// Context keeps the variable stack and resolves variables, as well as keywords
//
//   context['variable'] = 'testing'
//   context['variable'] //=> 'testing'
//   context['true']     //=> true
//   context['10.2232']  //=> 10.2232
//
//   context.stack do
//      context['bob'] = 'bobsen'
//   }
//
//   context['bob']  //=> null  class Context
class Context {
  static build({
    environments,
    outer_scope,
    registers,
    rethrow_errors,
    resource_limits,
    static_environments,
    block
  }) {
    return new this({ environments, outer_scope, registers, rethrow_errors, resource_limits, static_environments }, block);
  }

  constructor({
    environments = {},
    outer_scope = {},
    registers = {},
    rethrow_errors = false,
    resource_limits = null,
    static_environments = {}
  } = {}, block) {
    this.environments = [environments].flat(Infinity);
    this.static_environments = [static_environments].flat(Infinity);
    this.scopes = [outer_scope || {}];
    this.registers = registers;
    this.errors = [];
    this.warnings = [];
    this.partial = false;
    this.strict_variables = false;
    this.resource_limits = resource_limits || new Dry.ResourceLimits(Dry.Template.default_resource_limits);
    this.base_scope_depth = 0;
    this.interrupts = [];
    this.filters = [];
    this.global_filter = null;
    this.disabled_tags = {};

    this.exception_renderer = rethrow_errors
      ? Dry.RAISE_EXCEPTION_LAMBDA
      : Dry.Template.default_exception_renderer;

    if (block) block(this);
    this.squash_instance_assigns_with_environments();
    return new Proxy(this, handlers);
  }

  set strainer(value) {
    this[kStrainer] = value;
  }
  get strainer() {
    return (this[kStrainer] ||= Dry.StrainerFactory.create(this, this.filters));
  }

  // Adds filters to this context.
  //
  // Note that this does not register the filters with the main Template object.
  // see <tt>Template.register_filter</tt> for that
  //
  add_filters(filters) {
    this.filters.push(...[].concat(filters || []).flat().filter(Boolean));
    this.strainer = null;
  }

  apply_global_filter(obj) {
    return this.global_filter ? this.global_filter(obj) : obj;
  }

  // are there any not-handled interrupts?
  get interrupt() {
    return this.interrupts.length > 0;
  }

  // push an interrupt to the stack. this interrupt is considered not handled.
  push_interrupt(e) {
    this.interrupts.push(e);
  }

  // pop an interrupt from the stack
  pop_interrupt() {
    return this.interrupts.pop();
  }

  handle_error(e, line_number = null) {
    if (!(e instanceof Error)) e = this.internal_error();
    e.template_name ||= this.template_name;
    e.line_number ||= line_number;
    this.errors.push(e);
    return this.exception_renderer(e).toString();
  }

  invoke(method, ...args) {
    return this.strainer.invoke(method, ...args);
  }

  // Push new local scope on the stack. use <tt>Context//stack</tt> instead
  push(new_scope = {}) {
    this.scopes.push(new_scope);
    this.check_overflow();
    return new_scope;
  }

  // Merge a hash of variables in the current local scope
  merge(new_scopes) {
    Object.assign(this.scope, new_scopes);
  }

  // Pop from the stack. use <tt>Context//stack</tt> instead
  pop() {
    if (this.scopes.length === 1) {
      throw new Dry.ContextError();
    }
    this.scopes.pop();
  }

  // Pushes a new local scope on the stack, pops it at the } of the block
  //
  // Example:
  //   context.stack do
  //      context['var'] = 'hi'
  //   }
  //
  //   context['var]  //=> null
  stack(new_scope = {}, block) {
    try {
      this.push(new_scope);
      block();
    } catch (e) {
      this.handle_error(e);
    }
    this.pop();
  }

  // Creates a new context inheriting resource limits, filters, environment etc.,
  // but with an isolated scope.
  new_isolated_subcontext() {
    this.check_overflow();

    const subcontext = Context.build({
      resource_limits: this.resource_limits,
      static_environments: this.static_environments,
      registers: new Dry.StaticRegisters(this.registers)
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

  // Only allow String, Numeric, Hash, Array, Proc, Boolean or <tt>Dry.Drop</tt>
  set(key, value) {
    this.scope[key] = value;
    return true;
  }

  // Look up variable, either resolve directly after considering the name.
  // We can directly handle Strings, digits, floats and booleans (true,false).
  // If no match is made we lookup the variable in the current scope and
  // later move up to the parent blocks to see if we can resolve the variable somewhere up the tree.
  // Some special keywords return symbols. Those symbols are to be called on the rhs object in expressions
  //
  // Example:
  //   products == empty //=> products.empty?
  get(expression) {
    return this.evaluate(Dry.Expression.parse(expression));
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

  evaluate(object) {
    const output = object && typeof object.evaluate === 'function' ? object.evaluate(this) : object;

    if (typeof output === 'symbol') {
      return Dry.utils.toString(output);
    }

    if (output == null && object && Array.isArray(object.name) && object.name.input) {
      return this[object.name.input];
    }

    return output;
  }

  lookup_variable(objects, key) {
    for (const obj of objects) {
      const value = expand(obj, key);
      if (value !== undefined) {
        return value;
      }
    }
  }

  // Fetches an object starting at the local scope and then moving up the hierachy
  find_variable(key, { raise_on_not_found = true } = {}) {
    let variable = this.lookup_variable(this.scopes, key);
    if (variable === undefined) {
      variable = this.try_variable_find_in_environments(key, { raise_on_not_found });
    }

    if (variable && typeof variable.to_liquid === 'function') {
      variable = variable.to_liquid();
    }

    if (variable?.context) {
      variable.context = this;
    }

    return variable;
  }

  lookup_and_evaluate(obj, key, { raise_on_not_found = true } = {}) {
    if (this.strict_variables && raise_on_not_found && obj && !hasOwnProperty.call(obj, key)) {
      throw new Dry.UndefinedVariable(`undefined variable ${key}`);
    }

    let value = obj && obj[key];

    if (typeof value === 'function') {
      value = obj[key] =  value.call(obj, this);
    }

    return value;
  }

  with_disabled_tags(tag_names, block) {
    for (const name of tag_names) {
      this.disabled_tags[name] = (this.disabled_tags[name] || 0) + 1;
    }

    try {
      block();
    } catch (err) {
      console.error(err);
    }

    for (const name of tag_names) {
      this.disabled_tags[name]--;
    }
  }

  tag_disabled(tag_name) {
    return this.disabled_tags[tag_name] > 0;
  }

  try_variable_find_in_environments(key, { raise_on_not_found } = {}) {
    const find = environments => {
      for (const env of environments) {
        const found = this.lookup_and_evaluate(env, key, { raise_on_not_found });
        if (found != null || (this.strict_variables && raise_on_not_found)) {
          return found;
        }
      }
    };
    return [find(this.environments), find(this.static_environments)].find(v => v != null);
  }

  check_overflow() {
    if (this.overflow()) {
      throw new Dry.StackLevelError('Nesting too deep');
    }
  }

  overflow() {
    return this.base_scope_depth + this.scopes.length > MAX_DEPTH;
  }

  internal_error() {
    throw new Dry.InternalError('internal');
  }

  squash_instance_assigns_with_environments() {
    const scope = this.scope;

    for (const k of Object.keys(scope)) {
      const env = this.environments.find(env => k in env);
      if (env) {
        scope[k] = this.lookup_and_evaluate(env, k);
        break;
      }
    }
  }

  get scope() {
    return this.scopes[this.scopes.length - 1] || this.push({});
  }
}

module.exports = Context;
