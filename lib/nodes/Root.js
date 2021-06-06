'use strict';

const BlockNode = require('./BlockNode');

class Root extends BlockNode {
  constructor(node) {
    super(node);
    this.type = 'root';
    this.depth = 0;
  }

  render(context) {
    const output = this.nodes.map(node => node.render(context)).join('');
    return output;
  }
}

module.exports = Root;
