'use strict';

const BlockNode = require('./BlockNode');

class Range extends BlockNode {
  constructor(node) {
    super(node);
    this.type = 'range';
  }

  async render(locals) {
    const values = await Promise.all(this.nodes.map(node => node.render(locals)));
    return values.join('');
  }
}

module.exports = Range;
