/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "_.*" }]*/
'use strict';

const Dry = require('../Dry');
const { regex, utils } = Dry;
const { TagStart, TagEnd } = regex;

class Raw extends Dry.Tag {
  static OnlyWhitespace = /^\s*$/;
  static FullTokenPossiblyInvalid = utils.r`^([\\s\\S]*?)${TagStart}-?\\s*(\\w+)\\s*(.*)?-?${TagEnd}$`;

  constructor(node, state) {
    super(node, state);
    this.name = 'raw';
    this.blank = false;
  }

  parse(tokenizer) {
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

  parse_whitespace() {
    const [markup, _open, tol, tor, body, _close, tcl, tcr] = this.match;
    this.markup = markup;
    this.body = body;

    this.trim_open_left = tol === '-';
    this.trim_open_right = tor === '-';

    this.trim_close_left = tcl === '-';
    this.trim_close_right = tcr === '-';

    if (this.match.length < 8) {
      this.ensure_valid_markup();
    }

    this.trim_whitespace(true);
  }

  render() {
    this.trim_whitespace();
    return this.body;
  }

  trim_whitespace(parse = false) {
    const { next, prev, state } = this;

    if (!parse) {
      if (this.trim_close_right && next) next.value = next.value.trimStart();
      if (this.trim_close_left) this.body = this.body.trimEnd();
      if (this.trim_open_right) this.body = this.body.trimStart();
    } else if (this.trim_open_left && prev) {
      const first_byte = prev.value[0];
      prev.value = prev.value.trimEnd();

      if (state.template_options.bug_compatible_whitespace_trimming && prev.value === '') {
        prev.value += first_byte;
      }
    }
  }

  ensure_valid_markup() {
    const ensure_open = () => {
      if (!/{%-?\s*raw\s*-?%}/.test(this.value)) {
        this.raise_syntax_error('tag_unexpected_args', this.state, { tag_name: this.name });
      }
    };

    if (!/{%-?\s*endraw\s*-?%}/.test(this.value)) {
      ensure_open();
      this.raise_syntax_error('tag_never_closed', this.state, { block_name: this.name });
    }

    if (Raw.OnlyWhitespace.test(this.body)) {
      ensure_open();
      this.raise_syntax_error('tag_unexpected_args', this.state, { tag_name: this.name });
    }
  }
}

module.exports = Raw;
