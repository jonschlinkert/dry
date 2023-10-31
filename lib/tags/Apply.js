
const Dry = require('../Dry');

/**
 * The Apply tag applies filters to a block and renders it in-place.
 *
 *   {% apply upcase | split: '-' %}
 *     Monkeys!
 *   {% endapply %}
 */

class Apply extends Dry.BlockTag {
  async render(context, output = '') {
    this.variable ||= new Dry.Variable(`apply | ${this.match[3]}`, this.state, this);

    await context.stack({ apply: super.render(context) }, async () => {
      output = await this.variable.render(context);
    });

    return output;
  }
}

module.exports = Apply;
