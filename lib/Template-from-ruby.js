'use strict';

const { BlankFileSystem } = require('./FileSystem');
const Dry = require('./Dry');
const Document = require('./Document');
const ParseContext = require('./ParseContext');
const ResourceLimits = require('./ResourceLimits');
const StrainerFactory = require('./StrainerFactory');

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
class ArgumentError extends Error {}

const RAISE_EXCEPTION_LAMBDA = Symbol('RAISE_EXCEPTION_LAMBDA');
const kInstanceAssigns = Symbol(':instance_assigns');
const kRegisters = Symbol(':registers');
const kAssigns = Symbol(':assigns');
const kErrors = Symbol(':errors');

class Template {
  constructor() {
    this.rethrow_errors = false;
    this.resource_limits = new ResourceLimits(Template.default_resource_limits);
  }

  // Parse source code.
  // Returns self for easy chaining
  parse(source, options = {}) {
    this.parse_context = this.configure_options(options);
    this.tokenizer = this.parse_context = new Dry.Tokenizer(source, {
      startLineNumber: this.lineNumbers && 1
    });
    this.root = Document.parse(this.tokenizer, this.parse_context);
    return this;
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
    const first = args[0];
    const rest = [this.instance_assigns, this.registers, this.rethrow_errors, this.resource_limits];

    const context = (() => {
      if (first instanceof Dry.Context) {
        const c = args.shift();
        if (this.rethrow_errors) {
          c.exception_renderer = Dry[RAISE_EXCEPTION_LAMBDA];
        }
        return c;
      }

      if (first instanceof Dry.Drop) {
        const drop = args.shift();
        drop.context = new Dry.Context([drop, this.assigns], ...rest);
        return drop.context;
      }

      if (isObject(first)) {
        return new Dry.Context([args.shift, this.assigns], ...rest);
      }

      if (!context) {
        return new Dry.Context(this.assigns, ...rest);
      }

      throw new ArgumentError('Expected Hash or Dry.Context as parameter');
    })();

    let output = null;
    let options;

    const context_register = context.registers instanceof Dry.StaticRegisters
      ? context.registers.static
      : context.registers;

    const last = args[args.length - 1];

    if (isObject(last)) {
      options = args.pop();
      if (options.output) output = options.output;

      for (const [key, register] of Object.entries(options.registers)) {
        context_register.set(key, register);
      }

      this.apply_options_to_context(context, options);
    } else if (Array.isArray(last)) {
      context.add_filters(args.pop());
    }

    // Retrying a render resets resource usage
    context.resource_limits.reset();

    if (this.profiling && !context.profiler) {
      this.profiler = context.profiler = new Dry.Profiler();
    }

    try {
      // render the nodelist.
      return this.root.render_to_output_buffer(context, output || '');
    } catch (e) {
      if (e instanceof Dry.MemoryError) {
        context.handle_error(e);
      }
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
    const parse_context = !(options instanceof ParseContext) ? new ParseContext(options) : options;
    this.warnings = parse_context.warnings;
    return parse_context;
  }

  apply_options_to_context(context, options) {
    if (options.filters) context.add_filters(options.filters);
    if (options.global_filter) context.global_filter = options.global_filter;
    if (options.exception_renderer) context.exception_renderer = options.exception_renderer;
    if (options.strict_variables) context.strict_variables = options.strict_variables;
    if (options.strict_filters) context.strict_filters = options.strict_filters;
  }

  get registers() {
    return (this[kRegisters] ||= {});
  }

  get assigns() {
    return (this[kAssigns] ||= {});
  }

  get instance_assigns() {
    return (this[kInstanceAssigns] ||= {});
  }

  get errors() {
    return (this[kErrors] ||= []);
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
    return StrainerFactory.add_global_filter(mod);
  }

  // creates a new `Template` object from liquid source code
  // To enable profiling, pass in `profile: true` as an option.
  // See Dry.Profiler for more information
  static parse(source, options = {}) {
    return new this().parse(source, options);
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
Template.tags = new Map();
module.exports = Template;
