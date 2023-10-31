
const Dry = require('../Dry');

/**
 * Import is similar to `include` but specifically for macros.
 *
 *   {% import "signup" as "form" %}
 *
 */

class Import extends Dry.Tag {
  async render(context, output = '') {
    const template = new Dry.tags.Render(this, this.state, this);
    const imported = await template.find_partial(context);
    context.set(imported.context_variable_name, imported.partial.root.ast.macros);
    return '';
  }
}

module.exports = Import;
