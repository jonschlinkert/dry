/* eslint-disable no-case-declarations */
'use strict';

const Dry = require('../Dry');

class Root extends Dry.BlockTag {
  constructor(node, state, parent) {
    super(node, state, parent);
    this.type = this.name = 'root';
    this.blank = true;
    this.depth = 0;
  }

  first_node() {
    return this.nodes.find(node => node.type !== 'text' || node.value.trim() !== '');
  }

  get nodelist() {
    return this.nodes;
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  Parent = Root;
  get children() {
    return this.node.nodes.slice();
  }
}

module.exports = Root;
