'use strict';

const { Tag, Variable } = require('../nodes');
const Dry = require('../Dry');

class Assign extends Tag {
  #AssignSyntax = /^\(?([[\]\w$.-]+)\)?\s*=\s*(.*)\s*/m;

  parse() {
    this.parsed = true;

    if (this.Syntax(this.match[3], this.#AssignSyntax)) {
      this.to = this.last_match[1];
      this.from = new Variable(this.last_match[2], this.state);
    } else {
      this.raise_syntax_error(this.state, 'errors.syntax.assign');
    }
  }

  render(context) {
    this.parse();
    const value = this.from.render(context);
    context.set(this.to, value);
    context.push();
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

    if (Dry.utils.isObject(val)) {
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
}

module.exports = Assign;
