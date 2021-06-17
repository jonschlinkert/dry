'use strict';

const { defineProperty } = Reflect;
const { kToken } = require('../constants/symbols');

class Node {
  constructor(token = {}, state) {
    const { type = '', value = '', ...rest } = token;
    this.type = type;
    this.value = value;
    Object.assign(this, rest);
    defineProperty(this, kToken, { value: token[kToken], writable: true });
    defineProperty(this, 'match', { value: token.match, writable: true });
    defineProperty(this, 'loc', { value: token.loc, writable: true });
    if (state) this.state = state;
  }

  append(node) {
    this.value += node.value;

    if (node.loc && this.loc) {
      this.loc.end = node.loc.end;
    }

    if (node.match && this.match) {
      this.match ||= [''];
      this.match[0] += node.match[0];
    }

    if (this.parent && this.parent.append) {
      this.parent.append(node);
    }
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
      const next = this.parent.nodes[this.index + 1] || this.parent.next;
      return next !== this ? next : null;
    }
    return null;
  }
}

module.exports = Node;
