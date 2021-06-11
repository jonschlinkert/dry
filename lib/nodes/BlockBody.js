'use strict';

const BlockNode = require('./BlockNode');
const toString = s => s == null ? '' : String(s);

class BlockBody extends BlockNode {
  constructor(...args) {
    super(...args);
    this.blank = true;
    this.nodes = [];
  }

  render(context) {
    let output = '';

    for (const node of this.nodes) {
      output += toString(node.render(context));

      if (context.interrupted()) {
        break;
      }
    }

    context.resource_limits.increment_write_score(output);
    return output;
  }
}

module.exports = BlockBody;
