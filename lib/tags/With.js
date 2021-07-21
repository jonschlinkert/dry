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
  }

  async render(context) {
    const obj = await context.get(await context.evaluate(this.markup));
    const subcontext = await context.new_isolated_subcontext();
    subcontext.merge(obj);
    return super.render(subcontext);
  }
}

module.exports = With;
