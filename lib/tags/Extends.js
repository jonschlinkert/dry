'use strict';

const Dry = require('../Dry');

/**
 * The "extends" tag allows template inheritance.
 *
 *   {% extends "default.html" %}
 *
 */

class Extends extends Dry.Tag {
  async render(context, output = '') {
    const extended = new Dry.tags.Render(this, this.state);

    await context.stack({ blocks: this.state.blocks }, async () => {
      output = await extended.render(context);
    });

    context.push_interrupt(new Dry.tags.Interrupts.BreakInterrupt());
    return output;
  }
}

module.exports = Extends;
