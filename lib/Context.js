'use strict';

const set = require('set-value');
const expand = require('expand-value');

// const resolve = (v, context) => {
//   if (typeof v === 'function') v = v.call(context);
//   return v && v.to_liquid ? v.to_liquid() : v;
// };

const Dry = require('./Dry');
const {
  Expression,
  ResourceLimits,
  StrainerFactory,
  StaticRegisters,
  Template
} = Dry;

const kStrainer = Symbol('strainer');
const MAX_DEPTH = 100;

/**
 * Context keeps the variable stack and resolves variables, as well as keywords
 *
 *   context['variable'] = 'testing'
 *   context['variable'] //=> 'testing'
 *   context['true']     //=> true
 *   context['10.2232']  //=> 10.2232
 *
 *   context.stack(() => {
 *     context['bob'] = 'bobsen'
 *   });
 *
 *   context['bob'] //=> undefined
 */

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

    this.static_environments = [static_environments].flat(Infinity).filter(Boolean);
    this.scopes = [outer_scope];
    this.registers = registers;
    this.errors = [];
    this.warnings = [];
    this.partial = false;
    this.strict_variables = false;
    this.strict_filters = null;
    this.resource_limits = resource_limits || new ResourceLimits(Template.default_resource_limits);
    this.base_scope_depth = 0;
    this.interrupts = [];
    this.filters = [];
    this.global_filter = null;
    this.disabled_tags = {};
    this.profiler = null;
    this.template_name = null;
    this.state = null;

    this.exception_renderer = rethrow_errors
      ? Dry.RAISE_EXCEPTION_LAMBDA
      : Template.default_exception_renderer;

    if (block) block(this);
    this.squash_instance_assigns_with_environments();
    return new Proxy(this, Dry.utils.handlers);
  }

  set strainer(value) {
    this[kStrainer] = value;
  }
  get strainer() {
    return (this[kStrainer] ||= StrainerFactory.create(this, this.filters));
  }

  /**
   * Adds filters to this context.
   *
   * Note that this does not register the filters with the main Template object.
   * see <tt>Template.register_filter</tt> for that
   */

  add_filters(filters) {
    this.filters = this.filters.concat(filters).flat(Infinity);
    this.strainer = null;
  }

  apply_global_filter(obj) {
    return typeof this.global_filter === 'function' ? this.global_filter(obj) : obj;
  }

  // are there any not-handled interrupts?
  interrupted() {
    return this.interrupts.length > 0;
  }

  // push an interrupt to the stack. this interrupt is considered not handled.
  push_interrupt(interrupt) {
    this.interrupts.push(interrupt);
  }

  // pop an interrupt from the stack
  pop_interrupt() {
    return this.interrupts.pop();
  }

  handle_error(e, line_number = null) {
    if (!(e instanceof Dry.Error)) e = this.internal_error(e);
    if (process.env.DEBUG) console.error(e);
    e.template_name ||= this.template_name;
    e.line_number ||= line_number;
    const key = this.state && this.state.error_mode === 'warn' ? 'warnings' : 'errors';
    this[key].push(e);
    return this.exception_renderer(e).toString();
  }

  invoke(method, ...args) {
    return this.strainer.invoke(method, ...args);
  }

  // Push new local scope on the stack. use <tt>Context#stack</tt> instead
  push(new_scope = {}) {
    this.scopes.unshift(new_scope);
    this.check_overflow();
    return new_scope;
  }

  // Merge a hash of variables onto the current local scope
  merge(new_scopes) {
    Object.assign(this.scope, new_scopes);
  }

  // Pop from the stack. use <tt>Context#stack</tt> instead
  pop() {
    if (this.scopes.length === 1) throw new Dry.ContextError();
    this.scopes.shift();
  }

  /**
   * Pushes a new local scope on the stack, pops it at the } of the block
   *
   * Example:
   *   context.stack do
   *      context['var'] = 'hi'
   *   }
   *
   *   context['var]  //=> null
   */

  stack(new_scope = {}, block) {
    this.push(new_scope);
    block(this.scope);
    this.pop();
  }

  /**
   * Creates a new context inheriting resource limits, filters, environment etc.,
   * but with an isolated scope.
   */

  new_isolated_subcontext() {
    this.check_overflow();

    const subcontext = Context.build({
      resource_limits: this.resource_limits,
      static_environments: this.static_environments,
      registers: new StaticRegisters(this.registers)
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
    this.scopes[0] = {};
  }

  /**
   * Only allow String, Numeric, Hash, Array, Proc, Boolean or `Dry.Drop`.
   */

  set(key, value) {
    set(this.scope, key, value);
    return true;
  }

  get(expression) {
    let value = this.lookup(expression);

    if (typeof value === 'function') {
      value = this.scope[expression] = value();
    }

    if (value && typeof value.to_liquid === 'function') {
      return value.to_liquid();
    }

    return value;
  }

  /**
   * Look up variable, either resolve directly after considering the name. We can
   * directly handle Strings, digits, floats and booleans (true,false). If no match
   * is made we lookup the variable in the current scope and later move up to the
   * parent blocks to see if we can resolve the variable somewhere up the tree. Some
   * special keywords return symbols. Those symbols are to be called on the rhs object
   * in expressions.
   *
   * Example:
   *   products == empty //=> products.empty?
   */

  lookup(expression) {
    const onResolve = (value, key) => {
      if (this.should_add_context(value)) {
        value.context = this;
      }
    };

    let value = expand(this.scope, expression, { onResolve });
    if (value === undefined) value = this.evaluate(Expression.parse(expression));
    return value;
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

  resolve_variable(variable, obj, key) {
    if (Dry.utils.isPrimitive(variable) || Dry.utils.isNil(variable)) return variable;

    if (this.should_add_context(variable)) {
      variable.context = this;
    }

    if (this.should_add_context(obj)) {
      obj.context = this;
    }

    if (typeof variable === 'function') {
      variable = variable.call(obj, this);

      if (obj && key && variable != null) {
        obj[key] = variable;
      }
    }

    if (variable && typeof variable === 'object' && typeof variable.to_liquid === 'function') {
      variable = variable.to_liquid();
    }

    return variable;
  }

  should_add_context(v) {
    if (!Dry.utils.isNil(v) && !Dry.utils.isPrimitive(v)) {
      return ('context' in v && v.context instanceof Context) || v instanceof Dry.Drop;
    }
    return false;
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
  find_variable(key, raise_on_not_found = true) {
    let variable = key in this.scope ? this.scope[key] : this.lookup_variable(this.scopes, key);

    if (variable === undefined) {
      variable = this.try_variable_find_in_environments(key, raise_on_not_found);
    }

    return this.resolve_variable(variable, this.scope, key);
  }

  lookup_and_evaluate(obj, key, raise_on_not_found = true) {
    if (this.strict_variables && raise_on_not_found && obj && !(key in obj)) {
      throw new Dry.UndefinedVariable(`undefined variable ${key}`);
    }

    return obj && this.resolve_variable(obj[key], obj, key);
  }

  with_disabled_tags(tag_names, block) {
    for (const name of tag_names) {
      this.disabled_tags[name] = (this.disabled_tags[name] || 0) + 1;
    }

    try {
      return block();
    } catch (err) {
      if (process.env.DEBUG) console.error(err);
    }

    for (const name of tag_names) {
      this.disabled_tags[name]--;
    }
  }

  tag_disabled(tag_name) {
    return this.disabled_tags[tag_name] > 0;
  }

  try_variable_find_in_environments(key, raise_on_not_found) {
    const find = environments => {
      for (const env of environments) {
        const found = this.lookup_and_evaluate(env, key, raise_on_not_found);
        if (found !== undefined || (this.strict_variables && raise_on_not_found)) {
          return found;
        }
      }
    };
    return [find(this.environments), find(this.static_environments)].find(v => v !== undefined);
  }

  check_overflow() {
    if (this.overflow()) {
      throw new Dry.StackLevelError(`Nesting too deep: ${this.total_depth} levels`);
    }
  }

  get total_depth() {
    return this.base_scope_depth + this.scopes.length;
  }

  overflow() {
    return this.total_depth > MAX_DEPTH;
  }

  internal_error(e) {
    throw new Dry.InternalError(e && e.message || 'internal');
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
    return this.scopes[0];
  }

  * [Symbol.iterator]() {
    const context = Object.assign(...this.static_environments, ...this.environments);

    for (const scope of this.scopes.slice().reverse()) {
      Object.assign(context, scope);
    }

    yield context;
  }
}

module.exports = Context;
