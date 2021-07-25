'use strict';

const Dry = require('../Dry');

/**
 * Import is similar to `include` but specifically for macros.
 *
 *   {% import "signup" as "form" %}
 *
 */

class Import extends Dry.Tag {
  async render(context, output = '') {
    const template = new Dry.tags.Render(this, this.state);
    const imported = await template.find_partial(context);
    const macros = imported.partial.root.ast.macros;
    context.set(imported.context_variable_name, macros);
    return '';
  }
}

module.exports = Import;
