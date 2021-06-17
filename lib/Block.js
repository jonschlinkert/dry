'use strict';

const BlockBody = require('./BlockBody');
const Tag = require('./nodes/Tag');
const Dry = require('./Dry');

class Block extends Tag {
  static MAX_DEPTH = 100;

  constructor(tag_name, markup, options) {
    super(tag_name, markup, options);
    this.blank = true;
  }

  parse(tokens) {
    this.body = new BlockBody();
    while (this.parse_body(this.body, tokens));
    return this.body;
  }

  render(context) {
    return this.body.render(context);
  }

  get nodelist() {
    return this.body.nodelist;
  }

  unknown_tag(tag_name, _markup, _tokenizer) {
    return Block.raise_unknown_tag(tag_name, this.block_name, this.block_delimiter, this.state);
  }

  // @api private
  static raise_unknown_tag(tag, block_name, block_delimiter, state) {
    if (tag === 'else') {
      throw new Dry.SyntaxError(state.locale.t('errors.syntax.unexpected_else', { block_name }));
    } else if (tag.startsWith('end')) {
      throw new Dry.SyntaxError(state.locale.t('errors.syntax.invalid_delimiter', { tag, block_name, block_delimiter }));
    } else {
      throw new Dry.SyntaxError(state.locale.t('errors.syntax.unknown_tag', { tag }));
    }
  }

  raise_tag_never_closed(block_name) {
    throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.tag_never_closed', { block_name }));
  }

  get block_name() {
    return this.tag_name || this.name;
  }

  get block_delimiter() {
    return (this.block_delimiter ||= `end${this.block_name}`);
  }

  // @api public
  parse_body(body, tokens) {
    if (this.state.depth >= Block.MAX_DEPTH) {
      throw new Dry.StackLevelError('Nesting too deep');
    }

    this.state.depth++;

    try {
      body.parse(tokens, this.state, (end_tag_name, end_tag_params) => {
        this.blank &&= body.blank;

        if (end_tag_name === this.block_delimiter) return false;
        if (!end_tag_name) return this.raise_tag_never_closed(this.block_name);

        // this tag is not registered with the system
        // pass it to the current block for special handling or error reporting
        return this.unknown_tag(end_tag_name, end_tag_params, tokens);
      });
    } finally {
      this.state.depth--;
    }

    return true;
  }
}

module.exports = Block;
