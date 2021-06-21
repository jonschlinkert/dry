'use strict';

const Dry = require('./Dry');
const Tokenizer = require('./expressions/Tokenizer');
const { kOptions, kPartialOptions } = require('./constants/symbols');

class State {
  constructor(options = {}) {
    this.path = options.path || 'unknown';
    this.template_options = options;
    this.locale = (options.local ||= new Dry.I18n());
    this.warnings = [];
    this.depth = 0;
    this.error_mode = this.template_options.error_mode || Dry.Template.error_mode;
    this.blocks = Dry.Template.blocks;
    this[kPartialOptions] = false;
  }

  get(key) {
    return this.options[key] || this[key];
  }

  get_block(name) {
    return Dry.Template.get_block(this.path, name);
  }

  set_block(name, block) {
    Dry.Template.set_block(this.path, name, block);
    return block;
  }

  partial(value) {
    this[kPartialOptions] = value;
    this.options = value ? this.partial_options : this.template_options;
    this.error_mode = this.options.error_mode || Dry.Template.error_mode;
  }

  new_tokenizer(markup, { start_line_number = null, for_liquid_tag = false }) {
    return new Tokenizer(markup, { line_number: start_line_number, for_liquid_tag });
  }

  parse_expression(markup) {
    return Dry.Expression.parse(markup);
  }

  set partial_options(value) {
    this[kOptions] = value;
  }
  get partial_options() {
    const options = () => {
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
    };

    if (!this[kOptions]) {
      this[kOptions] = options();
    }

    return this[kOptions];
  }
}

module.exports = State;
