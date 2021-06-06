'use strict';

const Conditional = require('./Conditional');

class Branch {
  constructor(node) {
    this.name = node.name;
    this.conditional = new Conditional(node);
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
