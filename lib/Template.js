'use strict';

const filters = require('./StandardFilters');
const Parser = require('./Parser');
const tags = require('./tags');
const Dry = require('./Dry');
const { BlankFileSystem } = require('./FileSystem');

class Template {
  constructor(options) {
    this.options = { ...options };
    this.registers = new Map();
    this.rethrow_errors = false;
    this.resource_limits = new Dry.ResourceLimits(Template.default_resource_limits);
    this.instance_assigns = {};
    this.assigns = {};
    this.errors = [];
    this.filters = Template.filters;
    this.tags = Template.tags;

    for (const [name, Tag] of Object.entries(tags)) {
      this.register_tag(name.toLowerCase(), Tag);
    }
  }

  bind_filters(context) {
    if (this.bound_filters) return;
    this.bound_filters = true;

    Template.filters = new Map();

    for (const filters of Dry.StrainerFactory.global_filters) {
      for (const [key, fn] of Object.entries(filters)) {
        const _fn = fn._orig || fn;

        Reflect.defineProperty(fn, 'name', { value: key });

        const filter = function(...args) {
          const ctx = this || {};
          ctx.context = context;
          return _fn.call(ctx, ...args);
        };

        filter._orig = _fn;
        filters[key] = filter;
      }
    }
  }

  register_filter(name, filter) {
    this.constructor.register_filter(name, filter);
  }

  register_tag(name, Tag) {
    this.constructor.register_tag(name, Tag);
  }

  // Parse source code.
  // Returns self for easy chaining
  // parse2(source, options = {}) {
  //   this.state = this.configure_options(options);
  //   this.tokenizer = this.state = new Dry.Tokenizer(source, {
  //     startLineNumber: this.lineNumbers && 1
  //   });
  //   this.root = Document.parse(this.tokenizer, this.state);
  //   return this;
  // }

  parse(source, options = {}) {
    this.state = this.configure_options(options);
    this.root = new Parser(source, options, this.state);
    this.root.parse();
    return this;
  }

  create_context(obj) {
    const subcontext = env => ({
      environments: env ? [env, this.assigns] : [this.assigns],
      outer_scope: this.instance_assigns,
      registers: this.registers,
      rethrow_errors: this.rethrow_errors,
      resource_limits: this.resource_limits
    });

    if (obj instanceof Dry.Context) {
      if (this.rethrow_errors) {
        obj.exception_renderer = Dry[Dry.constants.RAISE_EXCEPTION_LAMBDA];
      }
      return { context: obj, shifted: true };
    }

    if (obj instanceof Dry.Drop) {
      obj.context = new Dry.Context(subcontext(obj));
      return { context: obj.context, shifted: true };
    }

    if (Dry.utils.isObject(obj)) {
      return { context: new Dry.Context(subcontext(obj)), shifted: true };
    }

    if (!obj) {
      return { context: new Dry.Context(subcontext()), shifted: false };
    }

    throw new Dry.ArgumentError('Expected an object or Dry#Context as the first argument');
  }

  // Render takes a hash with local variables.
  //
  // if you use the same filters over and over again consider registering them globally
  // with <tt>Template.register_filter</tt>
  //
  // if profiling was enabled in <tt>Template#parse</tt> then the resulting profiling information
  // will be available via <tt>Template#profiler</tt>
  //
  // Following options can be passed:
  //
  //  * <tt>filters</tt> : array with local filters
  //  * <tt>registers</tt> : hash with register variables. Those can be accessed from
  //    filters and tags and might be useful to integrate liquid more with its host application
  //
  render(...args) {
    if (!this.root) return '';

    const { context, shifted } = this.create_context(args[0]);

    if (shifted) {
      args.shift();
    }

    this.bind_filters(context);
    let output = '';
    let options;

    const last = args[args.length - 1];

    if (Dry.utils.isObject(last)) {
      options = args.pop();

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
      this.context = context;
      return output + this.root.render(context);
    } catch (err) {
      if (err instanceof Dry.MemoryError) {
        return context.handle_error(err);
      }

      throw err;
    } finally {
      this.errors = context.errors;
    }
  }

  // initially "render!"
  render_strict(...args) {
    this.rethrow_errors = true;
    return this.render(...args);
  }

  render_to_output_buffer(context, output) {
    return this.render(context, { output });
  }

  configure_options(options) {
    this.options = options;
    this.profiling = options.profile;

    if (this.profiling && !this.profiler) {
      throw new Error("Profiler not loaded, require 'liquid/profiler' first");
    }

    this.lineNumbers = options.lineNumbers || this.profiling;
    const state = !(options instanceof Dry.State) ? new Dry.State(options) : options;
    this.warnings = state.warnings;
    return state;
  }

  apply_options_to_context(context, options) {
    if (options.filters) context.add_filters(options.filters);
    if (options.global_filter) context.global_filter = options.global_filter;
    if (options.exception_renderer) context.exception_renderer = options.exception_renderer;
    if (options.strict_variables) context.strict_variables = options.strict_variables;
    if (options.strict_filters) context.strict_filters = options.strict_filters;
  }

  get loc() {
    return this.root.lexer.loc;
  }

  static default_exception_renderer(exception) {
    return exception;
  }

  static register_tag(name, Tag) {
    this.tags.set(name.toString(), Tag);
  }

  // Pass a module with filter methods which should be available
  // to all liquid views. Good for registering the standard library
  static register_filter(mod) {
    return Dry.StrainerFactory.add_global_filter(mod);
  }

  // creates a new `Template` object from liquid source code
  // To enable profiling, pass in `profile: true` as an option.
  // See Dry.Profiler for more information
  static parse(source, options = {}) {
    return new this(options).parse(source);
  }
}

// Sets how strict the parser should be.
// :lax acts like liquid 2.5 and silently ignores malformed tags in most cases.
// :warn is the default and will give deprecation warnings when invalid syntax is used.
// :strict will enforce correct syntax.
// attr_accessor :error_mode
Template.error_mode = 'lax';
Template.file_system = new BlankFileSystem();
Template.default_resource_limits = {};
Template.filters = new Map();
Template.tags = new Map();
Dry.StrainerFactory.add_global_filter(filters);
module.exports = Template;
