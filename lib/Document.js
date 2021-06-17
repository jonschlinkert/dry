'use strict';

const Dry = require('./Dry');
const BlockBody = require('./BlockBody');

class Document {
  static parse(tokenizer, state, options) {
    const doc = new this(state);
    doc.parse(tokenizer, state, options);
    return doc;
  }

  constructor(state) {
    this.state = state;
    this.body = new BlockBody();
  }

  get nodelist() {
    return this.body.nodelist;
  }

  parse(tokenizer, state, options) {
    try {
      while (this.parse_body(tokenizer, state, options));
      return this.body;
    } catch (e) {
      e.line_number ||= state.line_number;
      throw e;
    }
  }

  unknown_tag(tag_name) {
    if (tag_name === 'else' || tag_name.startsWith('end')) {
      throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.unexpected_outer_tag', { tag_name }));
    } else {
      throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.unknown_tag', { tag_name }));
    }
  }

  render_to_output_buffer(context) {
    return this.body.render_to_output_buffer(context);
  }

  render(context) {
    return this.render_to_output_buffer(context);
  }

  parse_body(tokenizer, state) {
    return this.body.parse(tokenizer, state, (unknown_tag_name, unknown_tag_markup) => {
      if (unknown_tag_name) {
        this.unknown_tag(unknown_tag_name, unknown_tag_markup, tokenizer);
        return true;
      }
      return false;
    });
  }
}

module.exports = Document;
