'use strict';

const Dry = require('../Dry');

const kTagname = Symbol(':tag_name');
const kDelimiter = Symbol(':block_delimiter');

class BlockTag extends Dry.BlockNode {
  static disabled_tags = Dry.Tag.disabled_tags;

  static parse(node, tokenizer, state) {
    const tag = new this(node, state);
    tag.parse(tokenizer);
    return tag;
  }

  constructor(node, state, parent) {
    super(node, state, parent);
    this.type = 'block_tag';
    this.blank = true;
    this.args = [];

    if (this.name === 'elsif' || this.name === 'else') {
      this.else = true;
    }

    if (this.name && this.name.startsWith('end')) {
      this.end = true;
    }
  }

  parse() {
    this.body = this.new_body();
    while (this.parse_body(this.body, this.nodes));
    return this.body;
  }

  parse_whitespace(node, prev, next) {
    if (node && node.trim_left && prev) {
      prev.value = prev.value.trimEnd();
    }

    if (node && node.trim_right && next) {
      next.value = next.value.trimStart();
    }
  }

  parse_expression(markup) {
    const expr = this.state.parse_expression(markup);

    if (this.parent && expr instanceof Dry.VariableLookup) {
      Reflect.defineProperty(expr, 'parent', { value: this.parent });
    }

    return expr;
  }

  new_body() {
    return new Dry.BlockBody();
  }

  ParseSyntax(markup, regex) {
    return Dry.utils.ParseSyntax(this, markup, regex);
  }

  raise_syntax_error(key, state = this.state, options) {
    return this.constructor.raise_syntax_error(key, state, options);
  }

  raise_tag_never_closed(block_name, state) {
    return this.constructor.raise_syntax_error(block_name, state);
  }

  static raise_syntax_error(key, state, options) {
    throw new Dry.SyntaxError(state.locale.t(`errors.syntax.${key}`, options));
  }

  static raise_tag_never_closed(block_name, state) {
    this.raise_syntax_error('tag_never_closed', state, { block_name });
  }

  set tag_name(value) {
    this[kTagname] = value;
  }
  get tag_name() {
    return this[kTagname] || this.name;
  }

  get block_name() {
    return this.tag_name || this.name;
  }

  get block_delimiter() {
    return (this[kDelimiter] ||= `end${this.block_name}`);
  }

  get currentBranch() {
    return this.branches[this.branches.length - 1];
  }

  get raw() {
    return `${this.tag_name || this.name} ${this.value}`;
  }

  get tag_end_name() {
    return `end${this.name}`;
  }
}

module.exports = BlockTag;
