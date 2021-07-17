'use strict';

const Dry = require('./Dry');
const Tokenizer = require('./expressions/Tokenizer');
const Template = require('./Template');
const { kOptions, kPartial } = require('./constants/symbols');
const { blocks, collections } = Template;

class State {
  constructor(options = {}) {
    this.path = options.path || 'unknown';
    this.template_options = options;
    this.locale = options.locale || new Dry.I18n();

    this.registry = { blocks: {}, imports: {}, macros: {} };
    this.warnings = [];
    this.error_mode = this.template_options.error_mode || Template.error_mode;

    this.collections = collections;
    this.blocks = blocks;

    this[kPartial] = false;
    this.depth = 0;

    return new Proxy(this, {
      get(target, key) {
        if (target.options && hasOwnProperty.call(target.options, key)) {
          return target?.options[key];
        }
        return target[key];
      }
    });
  }

  set_block(name, block) {
    if (this.path) {
      Template.set_block(this.path, name, block);
      return block;
    }
    return (blocks[name] = block);
  }

  get_block(name) {
    return this.path ? Template.get_block(this.path, name) : blocks[name];
  }

  get_blocks() {
    return blocks[this.path] || blocks;
  }

  new_tokenizer(markup, { start_line_number = null, for_liquid_tag = false }) {
    return new Tokenizer(markup, { line_number: start_line_number, for_liquid_tag });
  }

  parse_expression(markup) {
    return Dry.Expression.parse(markup);
  }

  get line_number() {
    return this.loc && this.loc.line;
  }

  set partial(value) {
    this[kPartial] = value;
    this.options = value ? this.partial_options : this.template_options;
    this.error_mode = this.options.error_mode || Template.error_mode;
  }
  get partial() {
    return this[kPartial];
  }

  create_partial_options() {
    const dont_pass = this.template_options.include_options_blacklist;

    if (dont_pass === true) {
      return { locale: this.locale };
    }

    if (Array.isArray(dont_pass)) {
      const new_options = {};
      for (const key of Object.keys(this.template_options)) {
        if (!dont_pass.includes(key)) {
          new_options[key] = this.template_options[key];
        }
      }
      return new_options;
    }

    return this.template_options;
  }

  set partial_options(value) {
    this[kOptions] = value;
  }
  get partial_options() {
    return (this[kOptions] ||= this.create_partial_options());
  }
}

module.exports = State;
