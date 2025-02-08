const Dry = require('../Dry');
const Include = require('./Include');

// class FileSystem {
//   constructor(partials) {
//     this.partials = partials;
//   }

//   read_template_file(path) {
//     return this.partials[path];
//   }
// }
// this.partials = Dry.Template.file_system = new FileSystem(files);

/**
 * The "extends" tag allows template inheritance.
 *
 *   {% extends "default.html" %}
 *
 */

class Extends extends Include {
  async render(context, output = '') {
    const extended = new Dry.tags.Render(this, this.state, this);

    await context.stack({ blocks: this.state.blocks }, async () => {
      output = await extended.render(context);
    });

    context.push_interrupt(new Dry.tags.Interrupts.BreakInterrupt());
    return output;
  }
}

module.exports = Extends;
