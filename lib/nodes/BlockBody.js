'use strict';

const BlockNode = require('./BlockNode');
const toString = s => s == null ? '' : String(s);

class BlockBody extends BlockNode {
  constructor(...args) {
    super(...args);
    this.blank = true;
    this.nodes = [];
  }

  async render(context, output = '') {
    context.resource_limits.increment_write_score(this.nodes.length);

    for (const node of this.nodes) {
      output += toString(await node.render(context));
      this.blank &&= node.blank;

      if (context.interrupted()) {
        break;
      }
    }

    context.resource_limits.increment_write_score(output);
    return output;
  }
}

module.exports = BlockBody;
