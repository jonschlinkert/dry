'use strict';

const expand = require('expand-value');
const set = require('set-value');
const Dry = require('./Dry');

const { constants, Template, utils } = Dry;
const { handlers, isNil, isPlainObject, isPrimitive, resolve, toString } = utils;
const { kStrainer } = constants.symbols;

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
  static build(options) {
    return new Context(options);
  }

  constructor({
    environments = {},
    outer_scope = {},
    registers = {},
    rethrow_errors = false,
    resource_limits = null,
    static_environments = {}
  } = {}) {
    this.environments = [environments].flat(Infinity);

    this.static_environments = [static_environments].flat(Infinity).filter(Boolean);
    this.scopes = [outer_scope];
    this.scope.blocks ||= {};
    this.registers = registers;
    this.errors = [];
    this.warnings = [];
    this.partial = false;
    this.profiler = null;
    this.strict_variables = false;
    this.strict_filters = null;
    this.strict_errors = null;
    this.resource_limits = resource_limits || new Dry.ResourceLimits(Template.default_resource_limits);
    this.base_scope_depth = 0;
    this.interrupts = [];
    this.filters = [];
    this.global_filter = null;
    this.disabled_tags = {};
    this.template_name = null;
    this.inside_with_scope = false;
    this.allow_this_variable = false;
    this.state = null;

    this[constants.symbols.kParentContext] = null;
    this[constants.symbols.kWithParent] = null;

    this.exception_renderer = rethrow_errors
      ? Dry.RAISE_EXCEPTION_LAMBDA
      : Template.default_exception_renderer;

    this.squash_instance_assigns_with_environments();
    return new Proxy(this, handlers);
  }

  set strainer(value) {
    this[kStrainer] = value;
  }
  get strainer() {
    return (this[kStrainer] ||= Dry.StrainerFactory.create(this, this.filters));
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
    return resolve(typeof this.global_filter === 'function' ? this.global_filter(obj) : obj, this);
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
    e.template_name ||= this.template_name;
    e.line_number ||= line_number;
    this[this.state && this.state.error_mode === 'warn' ? 'warnings' : 'errors'].push(e);
    if (process.env.DEBUG) console.error(e);
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

  // Merge one or more hashes of variables onto the current local scope
  merge(new_scopes = []) {
    if (isPlainObject(new_scopes)) {
      Object.assign(this.scope, ...[].concat(new_scopes));
    }
  }

  // Pop from the stack. use <tt>Context#stack</tt> instead
  pop() {
    if (this.scopes.length === 1) throw new Dry.ContextError();
    this.scopes.shift();
  }

  /**
   * Pushes a new local scope on the stack, pops it at the end of the block
   *
   * Example:
   *   context.stack(() => {
   *      context['var'] = 'hi'
   *   })
   *
   *   context['var] //=> null
   */

  async stack(new_scope = {}, block) {
    this.push(new_scope instanceof Context ? {} : new_scope);
    const output = await block(this.scope);
    this.pop();
    return output;
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
      registers: new Dry.StaticRegisters(this.registers)
    });

    subcontext.base_scope_depth = this.base_scope_depth + 1;
    subcontext.exception_renderer = this.exception_renderer;
    subcontext.errors = this.errors;
    subcontext.warnings = this.warnings;

    subcontext.filters = this.filters;
    subcontext.strict_filters = this.strict_filters;

    subcontext.strainer = null;
    subcontext.disabled_tags = this.disabled_tags;

    subcontext.allow_this_variable = this.allow_this_variable;
    subcontext.inside_with_scope = this.inside_with_scope;
    subcontext[constants.symbols.kParentContext] = this;
    // console.log(subcontext)
    return subcontext;
  }

  clear_instance_assigns() {
    this.scopes[0] = {};
  }

  /**
   * Only allow String, Numeric, Object, Array, Boolean or `Dry.Drop`.
   */

  set(key, value) {
    set(this.scope, key, value);
    return true;
  }

  /**
   * Look up variable, either resolve directly after considering the name. We can directly handle
   * Strings, digits, floats and booleans (true,false).
   * If no match is made we lookup the variable in the current scope and
   * later move up to the parent blocks to see if we can resolve the variable somewhere up the tree.
   * Some special keywords return symbols. Those symbols are to be called on the rhs object in expressions
   *
   * Example:
   *   products == empty #=> products.empty?
   */

  get(expression) {
    const env = this.environments.find(e => expression in e);
    const value = env ? env[expression] : this.lookup(expression);
    const output = val => {
      if (typeof val === 'function') val = this.scope[expression] = val();
      if (val instanceof Dry.Drop) val.context = this;
      if (val && typeof val.to_liquid === 'function') val = val.to_liquid();
      if (val instanceof Promise) return val.then(v => output(v));
      return val;
    };
    return output(value);
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

  keys() {
    return Reflect.ownKeys(this.scope);
  }

  key(key) {
    return this.has(key);
  }

  async evaluate(object) {
    const output = await (typeof object?.evaluate === 'function' ? object.evaluate(this) : object);

    if (output instanceof Dry.Error) {
      this.handle_error(output, (this.state?.line_numbers && object?.line_number) ?? this.state?.loc.line);
    }

    return typeof output === 'symbol' ? toString(output) : output;
  }

  async find_this_variable(key) {
    const error = () => new Dry.SyntaxError('usage of "this" variable is not allowed');

    if (this.allow_this_variable === 'with' && this.inside_with_scope !== true) throw error();
    if (this.allow_this_variable === false) throw error();

    const scope = this.scopes.find(scope => scope.this_value);
    return scope ? scope.this_value : this;
  }

  // Fetches an object starting at the local scope and then moving up the hierachy
  async find_variable(key, raise_on_not_found = true) {
    if (key === 'this') return this.find_this_variable(key);

    let variable = key in this.scope ? this.scope[key] : await this.lookup(key, this.scopes);
    if (variable === undefined) {
      variable = await this.try_variable_find_in_environments(key, raise_on_not_found);
    }

    return this.resolve_variable(variable, this.scope, key);
  }

  lookup_and_evaluate(obj, key, raise_on_not_found = true) {
    if (this.strict_variables && raise_on_not_found && obj && obj[key] === undefined) {
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

  async try_variable_find_in_environments(key, raise_on_not_found) {
    for (const environment of this.environments) {
      const found_variable = await this.lookup_and_evaluate(environment, key, raise_on_not_found);
      if (found_variable !== undefined || (this.strict_variables && raise_on_not_found)) {
        return found_variable;
      }
    }

    for (const environment of this.static_environments) {
      const found_variable = await this.lookup_and_evaluate(environment, key, raise_on_not_found);
      if (found_variable !== undefined || (this.strict_variables && raise_on_not_found)) {
        return found_variable;
      }
    }
  }

  check_overflow() {
    if (this.overflow()) {
      return this.handle_error(new Dry.StackLevelError(`Nesting too deep: ${this.total_depth} levels`));
    }
  }

  get total_depth() {
    return this.base_scope_depth + this.scopes.length;
  }

  overflow() {
    return this.total_depth > Dry.MAX_DEPTH;
  }

  internal_error(e) {
    return new Dry.InternalError(e?.message || 'internal');
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

  lookup(expression, scopes) {
    if (!isPrimitive(expression)) {
      return expression;
    }

    // "onResolve" is used by expand-value after a value is
    // resolved for an object path segment.
    const onResolve = value => {
      if (this.should_add_context(value)) {
        value.context = this;
      }
    };

    let value;
    if (scopes) {
      for (const scope of scopes) {
        value = expand(scope, expression, { onResolve });
        if (value !== undefined) break;
      }
    } else {
      value = expand(this.scope, expression, { onResolve });
      value ||= this.evaluate(Dry.Expression.parse(expression));
    }

    return value;
  }

  resolve_variable(variable, obj, key) {
    if (isPrimitive(variable) || isNil(variable)) return variable;
    if (this.should_add_context(variable)) variable.context = this;
    if (typeof variable === 'function') {
      variable = variable.call(obj, this);

      if (obj && key && variable != null) {
        obj[key] = variable;
      }
    }
    return variable;
  }

  should_add_context(v) {
    if (v !== null && typeof v === 'object') {
      return ('context' in v && v.context instanceof Context) || v instanceof Dry.Drop;
    }
    return false;
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
