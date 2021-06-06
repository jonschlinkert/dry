'use strict';

const BlockNode = require('./BlockNode');

class Range extends BlockNode {
  constructor(node) {
    super(node);
    this.type = 'range';
  }

  render(locals) {
    const output = this.nodes.map(node => node.render(locals)).join('');
    return output;
  }
}

module.exports = Range;
