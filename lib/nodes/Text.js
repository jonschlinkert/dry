'use strict';

const Node = require('./Node');

class Text extends Node {
  constructor(node) {
    super(node);
    this.type = node.type || 'text';
  }

  parse() {}

  append(node) {
    super.append(node);

    if (node.match) {
      this.match ||= [''];
      this.match[0] += node.match[0];
    }
  }

  render() {
    return this.value;
  }
}

module.exports = Text;
