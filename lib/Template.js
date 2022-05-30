'use strict';

const fs = require('fs');
const Dry = require('./Dry');

class Template {
  // Sets how strict the parser should be.
  //   :lax acts like liquid 2.5 and silently ignores malformed tags in most cases.
  //   :warn is the default and will give deprecation warnings when invalid syntax is used.
  //   :strict will enforce correct syntax.
  static error_mode = 'lax';
  static default_resource_limits = {}
  static file_system = new Dry.FileSystem.BlankFileSystem();
  static filters = new Map();
  static tags = new Map();

  constructor(options) {
    this.options = { ...options };
    this.registers = {};
    this.rethrow_errors = false;
    this.resource_limits = new Dry.ResourceLimits(Template.default_resource_limits);
    this.instance_assigns = {};
    this.assigns = {};
    this.errors = [];
    this.filters = Template.filters;
    this.tags = Template.tags;

    for (const [name, Tag] of Object.entries(Dry.tags)) {
      this.register_tag(name.toLowerCase(), Tag);
    }
  }

  register_filter(name, filter) {
    this.constructor.register_filter(name, filter);
  }

  register_tag(name, Tag) {
    this.constructor.register_tag(name, Tag);
  }

  parse(source, options = {}) {
    this.state = this.configure_options(options);
    this.state.source = Buffer.from(source);
    this.root = new Dry.Parser(source, options, this.state);
    this.root.parse();
    return this;
  }

  create_context(...args) {
    const [obj] = args;

    const subcontext = env => ({
      environments: env ? [env, this.assigns] : [this.assigns],
      outer_scope: this.instance_assigns,
      registers: this.registers,
      rethrow_errors: this.rethrow_errors,
      resource_limits: this.resource_limits
    });

    if (obj instanceof Dry.Context) {
      if (this.rethrow_errors) obj.exception_renderer = Dry.RAISE_EXCEPTION_LAMBDA;
      return { context: obj, shifted: true };
    }

    if (obj instanceof Dry.Drop) {
      obj.context = new Dry.Context(subcontext(obj));
      return { context: obj.context, shifted: true };
    }

    return { context: new Dry.Context(subcontext(obj)), shifted: true };
    // if (Dry.utils.isObject(obj)) {
    // }

    // if (!obj) {
    //   return { context: new Dry.Context(subcontext()), shifted: false };
    // }

    // throw new Dry.ArgumentError('Expected an object or Dry#Context as the first argument');
  }

  /**
   * Render takes a hash with local variables.
   *
   * if you use the same filters over and over again consider registering them globally
   * with <tt>Template.register_filter</tt>
   *
   * if profiling was enabled in <tt>Template#parse</tt> then the resulting profiling information
   * will be available via <tt>Template#profiler</tt>
   *
   * Following options can be passed:
   *
   *  * <tt>filters</tt> : array with local filters
   *  * <tt>registers</tt> : hash with register variables. Those can be accessed from
   *    filters and tags and might be useful to integrate liquid more with its host application
   */

  async render(...args) {
    if (!this.root) return '';
    const { context, shifted } = this.create_context(...args);

    if (shifted) {
      args.shift();
    }

    context.state = this.state;
    this.context = context;
    this.errors = context.errors;
    this.warnings = context.warnings;

    this.bind_filters(context);

    const last = args[args.length - 1];
    let output = '';

    if (Dry.utils.isObject(last)) {
      const options = args.pop();

      const context_registers = context.registers instanceof Dry.StaticRegisters
        ? context.registers.static
        : context.registers;

      if (options.output) output = options.output;
      if (options.registers) {
        for (const [key, value] of Object.entries(options.registers)) {
          context_registers[key] = value;
        }
      }

      this.apply_options_to_context(context, options);
    } else if (last) {
      context.add_filters(args.pop());
    }

    // Retrying a render resets resource usage
    context.resource_limits.reset();

    if (this.profiling && !context.profiler) {
      this.profiler = context.profiler = new Dry.Profiler();
    }

    try {
      await Promise.all([...this.state.queue].map(fn => fn(context)));
      return this.root.render(context, output);
    } catch (e) {
      if (e instanceof Dry.MemoryError) return context.handle_error(e);
      if (e instanceof Dry.SyntaxError || !(e instanceof Dry.DryError)) throw e;
    }
  }

  // initially "render!"
  async render_strict(...args) {
    this.rethrow_errors = true;
    return this.render(...args);
  }

  render_to_output_buffer(context, output) {
    return this.render(context, { output });
  }

  configure_options(options = {}) {
    if (options.profile === true && !Dry.Profiler) {
      throw new Dry.DryError("Profiler not loaded, require 'dry/profiler' first");
    }

    this.options = options;
    this.profiling = options.profile === true;
    this.line_numbers = options.line_numbers || this.profiling;
    const state = !(options instanceof Dry.State) ? (this.state || new Dry.State(options)) : options;
    this.warnings = state.warnings;
    state.path = this.options.path || options.path;
    state.line_numbers = this.line_numbers;
    if (options.locale) state.locale = options.locale;
    return state;
  }

  apply_options_to_context(context, options) {
    if (options.filters) context.add_filters(options.filters);
    if (options.global_filter) context.global_filter = options.global_filter;
    if (options.allow_this_variable) context.allow_this_variable = options.allow_this_variable;
    if (options.exception_renderer) context.exception_renderer = options.exception_renderer;
    if (options.strict_variables) context.strict_variables = options.strict_variables;
    if (options.strict_filters) context.strict_filters = options.strict_filters;
  }

  bind_filters(context) {
    if (this.bound_filters) return;
    this.bound_filters = true;

    Template.filters = new Map();

    for (const filters of Dry.StrainerFactory.global_filters) {
      for (const [key, fn] of Object.entries(filters)) {
        if (typeof fn !== 'function') continue;

        const _fn = fn._orig || fn;
        Reflect.defineProperty(fn, 'name', { value: key });

        const filter = function(...args) {
          const ctx = this || {};
          if (typeof ctx === 'object') ctx.context = context;
          return _fn.call(ctx, ...args);
        };

        filter._orig = _fn;
        filters[key] = filter;
      }
    }
  }

  get loc() {
    return this.root.lexer.loc;
  }

  // Pass a module with filter methods which should be available
  // to all liquid views. Good for registering the standard library
  static register_filter = (...args) => {
    const [name, fn] = args;
    if (typeof fn === 'function') args = [{ [name]: fn }];
    return this.register_filters(...args);
  }

  // Pass a module with filter methods which should be available
  // to all liquid views. Good for registering the standard library
  static register_filters(...filters) {
    return Dry.StrainerFactory.add_global_filter(...filters);
  }

  static register_tag = (name, Tag) => {
    this.tags.set(name.toString(), Tag);
  };

  static register_tags = (...tags) => {
    for (const obj of [].concat(tags).flat()) {
      for (const { name, Tag } of Object.entries(obj)) {
        this.register_tag(name, Tag);
      }
    }
  };

  static default_exception_renderer(exception) {
    return exception;
  }

  static load = (filepath, options) => {
    return this.parse(fs.readFileSync(filepath), options);
  }

  // creates a new `Template` object from liquid source code
  // To enable profiling, pass in `profile: true` as an option.
  // See Dry.Profiler for more information
  static parse = (source, options = {}) => {
    return new this(options).parse(String(source), options);
  }

  static render = (source, context, options = {}) => {
    return this.parse(source, options).render(context, options);
  }

  static render_strict = (source, context, options = {}) => {
    const opts = { strict_filters: true, strict_variables: true, ...options };
    const template = this.parse(source, opts);
    return template.render_strict(context, opts);
  }

  // Pass a module with filter methods which should be available
  // to all liquid views. Good for registering the standard library
  static get Factory() {
    return Dry.TemplateFactory;
  }
}

// Register all built-in global filters
Template.register_filter(Dry.StandardFilters);
module.exports = Template;
