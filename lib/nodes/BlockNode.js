'use strict';

const { defineProperty } = Reflect;
const Node = require('./Node');

class BlockNode extends Node {
  constructor(node) {
    super(node);
    this.nodes = [];
  }

  append(node) {
    if (node.value && ((node.type !== 'open' && node.type !== 'close') || this.type !== 'tag')) {
      this.value = Buffer.concat([Buffer.from(this.value), Buffer.from(node.value)]);
    }
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

    if (!node.parsed && (node.type === 'open' || node.type === 'close')) {
      node.parse();
    }
  }

  render(locals) {
    const output = this.nodes.map(node => node.render(locals)).join('');
    return output;
  }
}

module.exports = BlockNode;
