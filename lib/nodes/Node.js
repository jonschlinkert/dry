'use strict';

const { defineProperty } = Reflect;
const { kToken } = require('../constants/symbols');

class Node {
  constructor(node = {}) {
    const { type = '', value = '', ...rest } = node;
    this.type = type;
    this.value = value;
    Object.assign(this, rest);
    defineProperty(this, kToken, { value: node[kToken], writable: true });
    defineProperty(this, 'match', { value: node.match, writable: true });
  }

  render(locals) {
    throw new Error(`The "${this.constructor.name}" node does not have a .render() method`);
  }

  get index() {
    return this.parent ? this.parent.nodes.indexOf(this) : -1;
  }

  get prev() {
    if (this.parent) {
      const prev = this.parent.nodes[this.index - 1] || this.parent.prev;
      return prev !== this ? prev : null;
    }
    return null;
  }

  get next() {
    if (this.parent) {
      // console.log(this.parent.nodes)
      const next = this.parent.nodes[this.index + 1] || this.parent.next;
      return next !== this ? next : null;
    }
    return null;
  }
}

module.exports = Node;
