'use strict';

const { defineProperty } = Reflect;
const Node = require('./Node');

class BlockNode extends Node {
  constructor(node, state) {
    super(node, state);
    this.nodes = [];
    this.blank = true;
  }

  prepend(node) {
    node.parent.nodes.pop();
    this.unshift(node);
  }

  unshift(node) {
    defineProperty(node, 'parent', { value: this });
    this.nodes.unshift(node);
  }

  push(node) {
    defineProperty(node, 'parent', { value: this });
    this.nodes.push(node);
  }

  render(context) {
    const output = this.nodes.map(node => node.render(context)).join('');
    context.resource_limits.increment_write_score(output);
    return output;
  }
}

module.exports = BlockNode;
