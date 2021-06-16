'use strict';

const Tag = require('../nodes/Tag');
const { r } = require('../shared/utils');
const { TAG_START, TAG_END } = require('../constants/regex');

class Raw extends Tag {
  OnlyWhitespace = /^\s*$/;
  FullTokenPossiblyInvalid = r`^([\\s\\S]*?)${TAG_START}-?\\s*(\\w+)\\s*(.*)?-?${TAG_END}$`;

  constructor(node, state) {
    super(node, state);
    this.blank = true;
    this.name = 'raw';
  }

  parse() {
    this.markup = this.match[0];
    this.open = this.match[1];
    this.trim_open_left = this.match[2] === '-';
    this.trim_open_right = this.match[3] === '-';
    this.body = this.match[4];
    this.close = this.match[5];
    this.trim_close_left = this.match[6] === '-';
    this.trim_close_right = this.match[7] === '-';

    if (this.match.length < 8) {
      this.ensure_valid_markup();
    }

    this.trim_whitespace();
  }

  trim_whitespace() {
    if (this.trim_open_left && this.prev) {
      const first_byte = this.prev.value[0];
      this.prev.value = this.prev.value.trimEnd();

      if (this.state.template_options.bug_compatible_whitespace_trimming && this.prev.value === '') {
        this.prev.value += first_byte;
      }
    }
  }

  render() {
    if (this.trim_close_right && this.next) this.next.value = this.next.value.trimStart();
    if (this.trim_close_left) this.body = this.body.trimEnd();
    if (this.trim_open_right) this.body = this.body.trimStart();
    return this.body;
  }

  ensure_valid_markup() {
    const ensure_open = () => {
      if (!/{%-?\s*raw\s*-?%}/.test(this.value)) {
        this.raise_syntax_error('errors.syntax.tag_unexpected_args', this.state, { tag_name: this.name });
      }
    };

    if (!/{%-?\s*endraw\s*-?%}/.test(this.value)) {
      ensure_open();
      this.raise_syntax_error('errors.syntax.tag_never_closed', this.state, { block_name: this.name });
    }

    if (this.OnlyWhitespace.test(this.body)) {
      ensure_open();
      this.raise_syntax_error('errors.syntax.tag_unexpected_args', this.state, { tag_name: this.name });
    }
  }
}

module.exports = Raw;
