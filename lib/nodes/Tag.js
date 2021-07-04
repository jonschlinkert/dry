'use strict';

const Node = require('./Node');
const Dry = require('../Dry');

class Tag extends Node {
  static disabled_tags = new Set();

  static parse(node, tokenizer, state) {
    const tag = new this(node, state);
    tag.tokenizer = tokenizer;
    tag.parse(tokenizer);
    return tag;
  }

  constructor(node, state) {
    super(node, state);
    this.type = 'tag';
    this.tag_name = node.name;
    this.markup = node.value.trim();
    this.disabled_tags = Tag.disabled_tags;
    this.blank = false;
  }

  parse() {}
  render() {
    return '';
  }

  disable_tags(...tag_names) {
    tag_names.flat().forEach(tag_name => this.disabled_tags.add(tag_name));
    // prepend(Disabler);
  }

  parse_expression(markup) {
    return this.state.parse_expression(markup);
  }

  ParseSyntax(markup, regex) {
    return (this.last_match = regex.exec(markup));
  }

  raise_syntax_error(key, state = this.state, options) {
    return this.constructor.raise_syntax_error(key, state, options);
  }

  get loc() {
    return this.token.loc;
  }

  get raw() {
    return `${this.tag_name || this.name} ${this.value}`;
  }

  static raise_syntax_error(key, state, options) {
    throw new Dry.SyntaxError(state.locale.t(key, options));
  }
}

module.exports = Tag;
