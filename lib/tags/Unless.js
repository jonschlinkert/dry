'use strict';

const BlockTag = require('../nodes/BlockTag');

class Unless extends BlockTag {
  constructor(token, state) {
    super(token, state);
    this.params = [];
  }

  parse() {}

  render(locals) {
    return this.context.stack(locals, context => {
      for (const branch of this.branches) {
        if (!branch.evaluate(context)) {
          return branch.attachment.render(context);
        }
      }
    });
  }

  static parse(token, tokenizer, template) {
    const tag = new this(token, template.state);
    tag.token = token;
    tag.parse(tokenizer);
    return tag;
  }
}

module.exports = Unless;
