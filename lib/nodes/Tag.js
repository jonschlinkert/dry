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
    for (const tag_name of tag_names.flat()) {
      this.disabled_tags.add(tag_name);
    }
    // prepend(Disabler);
  }

  parse_expression(markup) {
    return this.state.parse_expression(markup);
  }

  ParseSyntax(markup, regex) {
    return Dry.utils.ParseSyntax(this, markup, regex);
  }

  raise_syntax_error(key, state = this.state, options) {
    return this.constructor.raise_syntax_error(key, state, options, this);
  }

  raise_file_system_error(key, options, state = this.state) {
    throw new Dry.FileSystemError(state.locale.t(`errors.file_system.${key}`, options));
  }

  get loc() {
    return this.token.loc;
  }

  get raw() {
    return `${this.tag_name || this.name} ${this.value}`;
  }

  static raise_syntax_error(key, state, options, node) {
    const err = new Dry.SyntaxError(state.locale.t(`errors.syntax.${key}`, options));
    if (state.line_numbers) err.line_number = node.loc.end.line;
    err.message = err.toString();
    throw err;
  }
}

module.exports = Tag;
