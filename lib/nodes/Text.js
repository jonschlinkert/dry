'use strict';

const Node = require('./Node');

class Text extends Node {
  constructor(node, state) {
    super(node, state);
    this.type = node.type || 'text';
  }

  parse() {}

  render() {
    return this.value;
  }
}

module.exports = Text;
