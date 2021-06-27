'use strict';

const { regex: { TemplateRegex } } = require('../constants');

class Tokenizer {
  constructor(source, state = {}, { line_numbers = false } = {}) {
    const { line_number = null, for_liquid_tag = false } = state;
    this.loc = { index: 0, line: 0, col: 0 };
    this.source = source.toString();
    this.line_number = line_number || (line_numbers ? 1 : null);
    this.for_liquid_tag = for_liquid_tag;
    this.tokens = this.tokenize();
    this.index = 0;
  }

  eos() {
    return this.index > this.tokens.length - 1;
  }

  shift() {
    const token = this.tokens[this.index];
    this.index++;

    if (!token) return;
    if (this.line_number) {
      this.line_number += this.for_liquid_tag ? 1 : token.split('\n').length - 1;
    }

    return token;
  }

  tokenize() {
    if (!this.source) return [];
    if (this.for_liquid_tag) return this.source.split('\n');
    const tokens = this.source.split(TemplateRegex);

    // remove empty element at the beginning of the array
    if (!tokens[0]) tokens.shift();
    return tokens;
  }
}

module.exports = Tokenizer;
