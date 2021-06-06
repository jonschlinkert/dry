'use strict';

const Branch = require('./Branch');
const BlockBody = require('./BlockBody');
const BlockNode = require('./BlockNode');
const tags = require('../tags');

class BlockTag extends BlockNode {
  constructor(node) {
    super(node);
    this.type = 'block_tag';
    this.blank = true;

    if (this.name === 'elsif' || this.name === 'else') {
      this.else = true;
    }

    if (this.name && this.name.startsWith('end')) {
      this.end = true;
    }
  }

  push(node) {
    super.push(node);
    this.push_branch(node);
  }

  push_branch(node) {
    if (!this.branches) return;
    if (node.name && node.name.toString().startsWith('end')) return;
    if (node.type === 'open') node.name = 'main';
    if (node.name === 'main' || node.name === 'else' || node.name === 'elsif') {
      this.branches.push(new Branch(node));
      return;
    }

    if (this.currentBranch) {
      this.currentBranch.body.push(node);
    }
  }

  parse() {
    this.body = new BlockBody();
    while (this.parse_body(this.body, this.nodes));
    return this.body;
  }

  parse_nodes() {
    for (const node of this.nodes) {
      if (node.trim_left && node.prev) {
        node.prev.value = node.prev.value.trimEnd();
      }

      if (node.trim_right && node.next) {
        node.next.value = node.next.value.trimStart();
      }
    }
  }

  get raw() {
    return `${this.tag_name || this.name} ${this.value}`;
  }

  get currentBranch() {
    return this.branches[this.branches.length - 1];
  }

  get tag_name() {
    return this.name;
  }

  get tag_end_name() {
    return `end${this.name}`;
  }
}

module.exports = BlockTag;
