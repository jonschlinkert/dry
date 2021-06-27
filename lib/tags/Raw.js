'use strict';

const Tag = require('../nodes/Tag');
const { r } = require('../shared/utils');
const { TagStart, TagEnd } = require('../constants/regex');

class Raw extends Tag {
  static OnlyWhitespace = /^\s*$/;
  static FullTokenPossiblyInvalid = r`^([\\s\\S]*?)${TagStart}-?\\s*(\\w+)\\s*(.*)?-?${TagEnd}$`;

  constructor(node, state) {
    super(node, state);
    this.name = 'raw';
  }

  parse1(tokenizer) {
    this.body = '';

    while (!tokenizer.eos()) {
      const token = tokenizer.shift();
      const match = Raw.FullTokenPossiblyInvalid.exec(token);
      if (match && this.block_delimiter === match[2]) {
        if (match[1] !== '') this.body += match[1];
        return;
      }
      if (token) this.body += token;
    }

    this.raise_tag_never_closed(this.block_name);
  }

  parse() {
    const [markup, open, tol, tor, body, close, tcl, tcr] = this.match;

    this.markup = markup;
    this.open = open;
    this.trim_open_left = tol === '-';
    this.trim_open_right = tor === '-';
    this.body = body;
    this.close = close;
    this.trim_close_left = tcl === '-';
    this.trim_close_right = tcr === '-';

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

    if (Raw.OnlyWhitespace.test(this.body)) {
      ensure_open();
      this.raise_syntax_error('errors.syntax.tag_unexpected_args', this.state, { tag_name: this.name });
    }
  }

  get blank() {
    return this.body.trim() === '';
  }
}

module.exports = Raw;
