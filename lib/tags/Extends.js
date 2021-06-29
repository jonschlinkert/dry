'use strict';

const { BreakInterrupt } = require('./Interrupts');
const Dry = require('../Dry');

// Extends applies filters to a block and renders it in-place.
//
//   {% embed upcase | split: '-' %}
//     Monkeys!
//   {% endembed %}
//
class Extends extends Dry.Tag {
  render(context, output) {
    return this.render_to_output_buffer(context, output);
  }

  async render_to_output_buffer(context, output = '') {
    const extended = new Dry.tags.Render(this, this.state);
    const blocks = {};
    // const content = new Dry.tags.Block();

    for (const node of this.parent.nodes) {
      if (node === this) continue;
      if (node.type === 'block') {
        const name = context.evaluate(node.template_name_expr) || node.template_name;
        blocks[name] = node;
      } else {
        // content.push(node);
      }
    }

    // if (!blocks.content) {
    //   blocks.content = content;
    // }

    await context.stack({ blocks }, async () => {
      output = await extended.render(context);
    });

    context.push_interrupt(new BreakInterrupt());
    return output;
  }
}

module.exports = Extends;
