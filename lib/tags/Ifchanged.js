'use strict';

const Block = require('../nodes/BlockTag');

class IfChanged extends Block {
  render(context) {
    const block_output = super.render(context);
    let output = '';

    if (block_output !== context.registers['ifchanged']) {
      context.registers['ifchanged'] = block_output;
      output += block_output;
    }

    return output;
  }
}

module.exports = IfChanged;
