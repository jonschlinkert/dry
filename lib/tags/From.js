'use strict';

const Dry = require('../Dry');

// From is similar to `include` but specifically for macros.
//
//   {% from "signup" as "form" %}
//
class From extends Dry.BlockTag {
  render(context, output = '') {
    return this.render_to_output_buffer(context, output);
  }

  async render_to_output_buffer(context, output = '') {
    const node = this.nodes[0];
    const imported = new Dry.tags.Render(node, this.state);
    const variable = node.args.find((v, i) => node.args[i - 1] === 'import');
    const { partial } = await imported.find_partial(context);

    const registry = partial?.options?.registry?.macros;
    const macros = variable ? { [variable]: registry?.[variable] } : registry;

    await context.stack({ macros }, async () => {
      output = await this.render_inner(context);
    });

    return output;
  }
}

module.exports = From;
