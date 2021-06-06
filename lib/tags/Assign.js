'use strict';

const { Tag, Variable } = require('../nodes');
const utils = require('../utils');
const Dry = require('..');

class Assign extends Tag {
  ASSIGN_REGEX = /^\(?([[\]\w$.-]+)\)?\s*=\s*(.*)\s*/m;

  parse() {
    this.parsed = true;
    if (this.Syntax(this.match[3], this.ASSIGN_REGEX)) {
      this.to   = this.last_match[1];
      this.from = new Variable(this.last_match[2], this.state);
    } else {
      this.constructor.raise_syntax_error(this.state);
    }
  }

  render(context) {
    this.parse();
    const value = this.from.render(context);
    const new_scope = {};
    context.push(new_scope);
    context[this.to] = value;
    context.resource_limits.increment_assign_score(this.assign_score_of(value));
    return '';
  }

  assign_score_of(val) {
    if (typeof val === 'string') {
      return Buffer.from(val).length;
    }

    if (Array.isArray(val)) {
      return val.reduce((sum, child) => sum + this.assign_score_of(child), 1);
    }

    if (utils.isObject(val)) {
      let sum = 1;
      for (const [k, v] of Object.entries(val)) {
        sum += this.assign_score_of(k) + this.assign_score_of(v);
      }
      return sum;
    }

    return 1;
  }

  get blank() {
    return true;
  }

  static raise_syntax_error(state) {
    throw new Dry.SyntaxError(state.locale.t('errors.syntax.assign'));
  }
}

module.exports = Assign;
