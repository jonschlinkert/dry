'use strict';

const Condition = require('../Condition');

class Branch {
  constructor(node) {
    this.name = node.name;
    this.conditional = new Condition(node);
    this.body = [];
  }

  parse() {}

  push(node) {
    this.body.push(node);
  }

  evaluate(context) {
    return this.conditional.evaluate(context);
  }

  render(context) {
    return this.body.map(node => node.render(context)).join('');
  }
}

module.exports = Branch;
