'use strict';

const Dry = require('./Dry');
const { kOptions, kPartialOptions } = require('./constants/symbols');

class State {
  constructor(options = {}) {
    this.template_options = options;
    this.locale = (options.local ||= new Dry.I18n());
    this.warnings = [];
    this.depth = 0;
    this.error_mode = this.template_options.error_mode || Dry.Template.error_mode;
    this[kPartialOptions] = false;
  }

  get(key) {
    return this.options[key] || this[key];
  }

  partial(value) {
    this[kPartialOptions] = value;
    this.options = value ? this.partial_options : this.template_options;
    this.error_mode = this.options.error_mode || Dry.Template.error_mode;
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
