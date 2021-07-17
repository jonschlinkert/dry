'use strict';

const Dry = require('../Dry');

// Import is similar to `include` but specifically for macros.
//
//   {% import "signup" as "form" %}
//
class Import extends Dry.BlockTag {
  render(context, output = '') {
    return this.render_to_output_buffer(context, output);
  }

  async render_to_output_buffer(context, output = '') {
    const imported = new Dry.tags.Render(this.nodes[0], this.state);
    const { context_variable_name } = await imported.find_partial(context);

    await context.stack({ [context_variable_name]: this.state.registry.macros }, async () => {
      output = await this.render_inner(context);
    });

    return output;
  }
}

module.exports = Import;
