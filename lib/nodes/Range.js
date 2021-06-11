'use strict';

const BlockNode = require('./BlockNode');

class Range extends BlockNode {
  constructor(node) {
    super(node);
    this.type = 'range';
  }

  render(locals) {
    return this.nodes.map(node => node.render(locals)).join('');
  }
}

module.exports = Range;
