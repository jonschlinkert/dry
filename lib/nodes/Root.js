'use strict';

const BlockTag = require('./BlockTag');
const Dry = require('../Dry');

class Root extends BlockTag {
  constructor(node, state) {
    super(node, state);
    this.type = 'root';
    this.depth = 0;
  }

  get nodelist() {
    return this.nodes;
  }

  static get ParseTreeVisitor() {
    return class extends Dry.ParseTreeVisitor {
      Parent = Root;
      get children() {
        return this.node.nodes.slice();
      }
    };
  }
}

module.exports = Root;
