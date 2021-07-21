'use strict';

const Dry = require('../Dry');

/**
 * Extends allows you to extend another template:
 *
 *   {% extends "default.html" %}
 *
 */

class Extends extends Dry.Tag {
  render(context, output) {
    return this.render_to_output_buffer(context, output);
  }

  async render_to_output_buffer(context, output = '') {
    const extended = new Dry.tags.Render(this, this.state);
    const content = this.include_content && new Dry.tags.Block();
    const blocks = {};

    for (const node of this.parent.nodes) {
      if (node === this) continue;

      if (node.type === 'block') {
        const name = await context.evaluate(node.template_name_expr) || node.template_name;
        blocks[name] = node;
        continue;
      }

      if (this.include_content) {
        content.push(node);
      }
    }

    if (this.include_content && !blocks.content) {
      blocks.content = content;
    }

    await context.stack({ blocks }, async () => {
      output = await extended.render(context);
    });

    context.push_interrupt(new Dry.tags.Interrupts.BreakInterrupt());
    return output;
  }

  get include_content() {
    return this.state?.template_options?.include_extends_content === true;
  }
}

module.exports = Extends;
