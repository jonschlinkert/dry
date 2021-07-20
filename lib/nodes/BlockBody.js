'use strict';

const Dry = require('../Dry');
const toString = s => s == null ? '' : String(s);

class BlockBody extends Dry.BlockNode {
  constructor(...args) {
    super(...args);
    this.blank = true;
    this.nodes = [];
  }

  async render(context, output = '') {
    context.resource_limits.increment_render_score(this.nodes.length);

    for (const node of this.nodes) {
      output += toString(await node.render(context));
      this.blank &&= node.blank;

      if (context.interrupted()) {
        break;
      }

      try {
        context.resource_limits.increment_write_score(output);
      } catch (error) {
        return context.handle_error(error);
      }
    }

    return output;
  }
}

module.exports = BlockBody;
