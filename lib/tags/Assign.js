'use strict';

const Tag = require('../nodes/Tag');
const Variable = require('../nodes/Variable');
const SYNTAX_REGEX = /^\(?([[\]\w$.-]+)\)?\s*=\s*(.*)\s*/m;

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

class Assign extends Tag {
  constructor(...args) {
    super(...args);
    this.parse();
  }

  parse() {
    this.value = this.match[3];

    const match = SYNTAX_REGEX.exec(this.value);
    if (!match) throw new SyntaxError(`Invalid arguments: {% ${this.raw} %}`);

    this.to = match[1].trim();
    this.from = new Variable(match[2].trim());
  }

  render(context) {
    const value = this.from.render(context);
    context[this.to] = value;
    context.resource_limits.increment_assign_score(this.assign_score_of(value));
    return '';
  }

  assign_score_of(value) {
    if (typeof value === 'string') {
      return Buffer.from(value).length;
    }

    if (Array.isArray(value)) {
      return value.reduce((a, v) => a + this.assign_score_of(v), 1);
    }

    if (isObject(value)) {
      return Object.entries(value).reduce((a, [k, v]) => {
        return a + this.assign_score_of(k) + this.assign_score_of(v);
      }, 1);
    }

    return 1;
  }

  get blank() {
    return true;
  }
}

module.exports = Assign;
