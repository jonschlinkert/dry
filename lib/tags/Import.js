'use strict';

const Dry = require('../Dry');

// Import applies filters to a block and renders it in-place.
//
//   {% import "signup" as "form" %}
//   {% endimport %}
//
class Import extends Dry.BlockTag {
  render(context, output = '') {
    return this.render_to_output_buffer(context, output);
  }

  async render_to_output_buffer(context, output = '') {
    const imported = new Dry.tags.Render(this.nodes[0], this.state);
    const { context_variable_name } = imported.find_partial(context);

    await context.stack({ [context_variable_name]: this.state.registry.macros }, async () => {
      output = await this.render_inner(context);
    });

    return output;
  }
}

module.exports = Import;
