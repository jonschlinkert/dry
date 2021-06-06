'use strict';

const Node = require('./Node');

class Tag extends Node {
  constructor(node, state) {
    super(node);
    this.type = 'tag';
  }

  parse() {}
  render() {
    return '';
  }

  get loc() {
    return this.token.loc;
  }

  get raw() {
    return `${this.tag_name || this.name} ${this.value}`;
  }
}

module.exports = Tag;
