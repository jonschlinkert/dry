'use strict';

const Block = require('../nodes/BlockTag');

class IfChanged extends Block {
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
