'use strict';

const Node = require('./Node');
const Dry = require('../Dry');

class Tag extends Node {
  static parse(node, tokenizer, state) {
    const tag = new this(node, state);
    tag.tokenizer = tokenizer;
    tag.parse(tokenizer);
    return tag;
  }

  constructor(node, state) {
    super(node, state);
    this.type = 'tag';
  }

  parse() {}
  render() {
    return '';
  }

  get loc() {
    return this.token.loc;
  }

  get raw() {
    return `${this.tag_name || this.name} ${this.value}`;
  }

  Syntax(markup, regex) {
    return (this.last_match = regex.exec(markup));
  }

  raise_syntax_error(key, state = this.state, options) {
    return this.constructor.raise_syntax_error(key, state, options);
  }

  static raise_syntax_error(key, state, options) {
    throw new Dry.SyntaxError(state.locale.t(key, options));
  }
}

module.exports = Tag;
