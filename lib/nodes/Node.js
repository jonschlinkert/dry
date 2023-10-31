
const { defineProperty } = Reflect;
const { kBlank, kToken } = require('../constants/symbols');

class Node {
  constructor(token = {}, state, parent) {
    const { type = 'node', value = '', ...rest } = token;
    this.type = type;
    this.value = value;
    if (token.input) this.input = token.input;
    Object.assign(this, rest);
    defineProperty(this, kToken, { value: token[kToken], writable: true });
    defineProperty(this, 'state', { value: state, writable: true });
    defineProperty(this, 'parent', { value: parent, writable: true });
    defineProperty(this, 'match', { value: token.match, writable: true });
    defineProperty(this, 'loc', { value: token.loc, writable: true });
    if (state?.error_mode) this.error_mode = state.error_mode;
    if (state?.loc) this.line_number = state.loc.line;
  }

  clone() {
    return new this.constructor(this, this.state, this.parent);
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

  set blank(value) {
    this[kBlank] = value;
  }
  get blank() {
    return this[kBlank];
  }

  get index() {
    return this.parent ? this.parent.nodes.indexOf(this) : -1;
  }

  get siblings() {
    return this.parent?.nodes || [];
  }

  get first_node() {
    return this.nodes && this.nodes[0] || null;
  }

  get last_node() {
    return this.nodes && this.nodes[this.nodes.length - 1] || null;
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
