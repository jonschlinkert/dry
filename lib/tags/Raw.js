'use strict';

const Tag = require('../nodes/Tag');
const { r } = require('../shared/utils');
const { TAG_START, TAG_END } = require('../constants/regex');

class Raw extends Tag {
  Syntax = /^\s*$/;
  FullTokenPossiblyInvalid = r('m')`^(.*)${TAG_START}\\s*(\\w+)\\s*(.*)?${TAG_END}$`;

  constructor(node, state) {
    super(node, state);
    this.blank = true;
    this.name = 'raw';
    this.parse();
  }

  parse() {
    const [, open_delim = '', body, close_delim = ''] = this.match.slice();
    this.trim_left = open_delim.includes('-');
    this.trim_right = close_delim.includes('-');
    this.body = body;
    this.ensure_valid_markup();
  }

  render() {
    return this.body;
  }

  ensure_valid_markup() {
    if (this.Syntax.test(this.body)) {
      throw new SyntaxError(this.state.locale.t('errors.syntax.tag_unexpected_args', { tag: this.name }));
    }
  }
}

module.exports = Raw;
