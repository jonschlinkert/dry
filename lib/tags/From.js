'use strict';

const Dry = require('../Dry');

// From applies filters to a block and renders it in-place.
//
//   {% from upcase | split: '-' %}
//     Monkeys!
//   {% endfrom %}
//
class From extends Dry.BlockTag {
  render(context, output = '') {
    return this.render_to_output_buffer(context, output);
  }

  async render_to_output_buffer(context, output = '') {
    const node = this.nodes[0];
    const imported = new Dry.tags.Render(node, this.state);
    const variable = node.args.find((v, i) => node.args[i - 1] === 'import');
    const { partial } = imported.find_partial(context);

    const registry = partial.options.registry.macros;
    let macros = registry;

    if (variable) {
      macros = { [variable]: registry[variable] };
    }

    await context.stack({ macros }, async () => {
    // context.stack({ macros: this.state.registry.macros }, () => {
      output = await this.render_inner(context);
    });

    return output;
  }
}

module.exports = From;


