'use strict';

const Node = require('./Node');

class Literal extends Node {
  constructor(node) {
    super(node);
    this.type = node.type || 'literal';
  }

  parse() {}

  render() {
    return this.value;
  }
}

module.exports = Literal;
