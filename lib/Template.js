'use strict';

// const Document = require('./Document');
// const ParseContext = require('./ParseContext');
// const State = require('./State');
const { isObject } = require('./utils');
const { BlankFileSystem } = require('./FileSystem');
const StrainerFactory = require('./StrainerFactory');
const filters = require('./filters');
const Parser = require('./Parser');
const tags = require('./tags');
const Dry = require('./Dry');

const {
  RAISE_EXCEPTION_LAMBDA,
  kInstanceAssigns,
  kRegisters,
  kAssigns,
  kTags
} = require('./constants');

class Template {
  constructor(options) {
    this.options = { ...options };
    // this.state = new State(options);
    this.rethrow_errors = false;
    this.resource_limits = new Dry.ResourceLimits(Template.default_resource_limits);
    this.filters = Template.filters;
    this.tags = Template.tags;
    this.registers = new Map();
    this.errors = [];

    for (const [name, Tag] of Object.entries(tags)) {
      this.register_tag(name.toLowerCase(), Tag);
    }
  }

  register_filter(name, fn) {
    this.filters.set(name, fn);
  }

  register_tag(name, Tag) {
    this.tags.set(name, Tag);
  }

  // Parse source code.
  // Returns self for easy chaining
  // parse2(source, options = {}) {
  //   this.parse_context = this.configure_options(options);
  //   this.tokenizer = this.parse_context = new Dry.Tokenizer(source, {
  //     startLineNumber: this.lineNumbers && 1
  //   });
  //   this.root = Document.parse(this.tokenizer, this.parse_context);
  //   return this;
  // }

  parse(input) {
    this.root = new Parser(input);
    this.root.parse();
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
    const create = env => ({
      environments: env ? [env, this.assigns] : [this.assigns],
      outer_scope: this.instance_assigns,
      registers: this.registers,
      rethrow_errors: this.rethrow_errors,
      resource_limits: this.resource_limits
    });

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
        drop.context = new Dry.Context(create(drop));
        return drop.context;
      }

      if (isObject(first)) {
        const envs = args.shift();
        return new Dry.Context(create(envs));
      }

      if (!first) {
        return new Dry.Context(create());
      }

      throw new Dry.ArgumentError('Expected Hash or Dry#Context as parameter');
    })();

    let output = '';
    let options;

    const context_register = context.registers instanceof Map
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
      // render the ast.
      return output + this.root.render(context);
    } catch (e) {
      if (e instanceof Dry.MemoryError) {
        return context.handle_error(e);
      }
    } finally {
      this.errors = context.errors;
    }
  }

  render2(...args) {
    const context = ((...a) => {
      if (a[0] instanceof Dry.Context) return a.shift();
      if (isObject(a[0])) return new Dry.Context({ environments: a.shift() });
      return new Dry.Context();
    })(...args);

    return this.root.render(context);
  }

  // initially "render!"
  render_strict(...args) {
    this.rethrow_errors = true;
    return this.render(...args);
  }

  render_to_output_buffer(context, output) {
    return this.render(context, { output });
  }

  // configure_options(options) {
  //   this.options = options;
  //   this.profiling = options.profile;

  //   if (this.profiling && !this.profiler) {
  //     throw new Error("Profiler not loaded, require 'liquid/profiler' first");
  //   }

  //   this.lineNumbers = options.lineNumbers || this.profiling;
  //   const parse_context = !(options instanceof ParseContext) ? new ParseContext(options) : options;
  //   this.warnings = parse_context.warnings;
  //   return parse_context;
  // }

  // apply_options_to_context(context, options) {
  //   if (options.filters) context.add_filters(options.filters);
  //   if (options.global_filter) context.global_filter = options.global_filter;
  //   if (options.exception_renderer) context.exception_renderer = options.exception_renderer;
  //   if (options.strict_variables) context.strict_variables = options.strict_variables;
  //   if (options.strict_filters) context.strict_filters = options.strict_filters;
  // }

  get assigns() {
    return (this[kAssigns] ||= {});
  }

  get instance_assigns() {
    return (this[kInstanceAssigns] ||= {});
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

  static set tags(value) {
    Template[kTags] = value;
  }
  static get tags() {
    return (Template[kTags] ||= {});
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
