'use strict';

const { BlockTag, Variable } = require('../Dry');

/**
 * The Apply tag applies filters to a block and renders it in-place.
 *
 *   {% apply upcase | split: '-' %}
 *     Monkeys!
 *   {% endapply %}
 */

class Apply extends BlockTag {
  async render(context, output = '') {
    this.variable ||= new Variable(`apply | ${this.match[3]}`);

    await context.stack({ apply: super.render(context) }, async () => {
      output = await this.variable.render(context);
    });

    return output;
  }
}

module.exports = Apply;
