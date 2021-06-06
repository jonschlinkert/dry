'use strict';

const get = require('expand-value');
const Node = require('./Node');

class Variable extends Node {
  constructor(node = {}) {
    super(node);
    this.type = node.type || 'variable';
    this.expression = this.match[2];
  }

  parse() {}

  render(context) {
    return context[this.expression];
  }
}

module.exports = Variable;
