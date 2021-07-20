'use strict';

const Dry = require('../Dry');

// Embed applies filters to a block and renders it in-place.
//
//   {% embed upcase | split: '-' %}
//     Monkeys!
//   {% endembed %}
//
class Embed extends Dry.BlockTag {
  render(context, output = '') {
    return this.render_to_output_buffer(context, output);
  }

  async render_to_output_buffer(context, output = '') {
    const embedded = new Dry.tags.Render(this.nodes[0], this.state);

    await context.stack({ blocks: this.state.get_blocks() }, async () => {
      output = await embedded.render(context);
    });

    return output;
  }
}

module.exports = Embed;