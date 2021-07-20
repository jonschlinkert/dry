'use strict';

const Dry = require('../Dry');

class IfChanged extends Dry.BlockTag {
  async render(context) {
    const block_output = await super.render(context);
    let output = '';

    if (block_output !== context.registers['ifchanged']) {
      context.registers['ifchanged'] = block_output;
      output += block_output;
    }

    return output;
  }
}

module.exports = IfChanged;
