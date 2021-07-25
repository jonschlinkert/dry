'use strict';

const Dry = require('../Dry');

// {% with %}
//   {% assign foo = 42 %}
//   {{ foo }} {% comment %}foo is 42 here{% endcomment %}
// {% endwith %}
class With extends Dry.BlockTag {
  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];
    this.only = this.markup.endsWith(' only');
    if (this.only) {
      this.markup = this.markup.slice(0, -5);
    }
  }

  async render(context) {
    const prop = await context.evaluate(this.markup);
    const obj = await context.get(prop);
    const ctx = context.new_isolated_subcontext();
    return ctx.stack(obj, () => super.render(ctx));
  }
}

module.exports = With;
