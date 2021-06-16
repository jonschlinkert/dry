'use strict';

const BlockBody = require('./BlockBody');
const BlockNode = require('./BlockNode');
// const Branch = require('./Branch');
const Dry = require('../Dry');

class BlockTag extends BlockNode {
  static parse(node, tokenizer, state) {
    const tag = new this(node, state);
    tag.parse(tokenizer);
    return tag;
  }

  constructor(node, state) {
    super(node, state);
    this.type = 'block_tag';
    this.blank = true;

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
  // parse_whitespace() {
  //   for (const node of this.nodes) {
  //     if (node.trim_left && node.prev) {
  //       node.prev.value = node.prev.value.trimEnd();
  //     }

  //     if (node.trim_right && node.next) {
  //       node.next.value = node.next.value.trimStart();
  //     }
  //   }
  // }

  new_body() {
    return new BlockBody();
  }

  Syntax(markup, regex) {
    return (this.last_match = regex.exec(markup));
  }

  raise_syntax_error(key, state = this.state, options) {
    return this.constructor.raise_syntax_error(key, state, options);
  }

  raise_tag_never_closed(block_name, state) {
    return this.constructor.raise_syntax_error(block_name, state);
  }

  static raise_tag_never_closed(block_name, state) {
    throw new Dry.SyntaxError(state.locale.t('errors.syntax.tag_never_closed', { block_name }));
  }

  static raise_syntax_error(key, state) {
    throw new Dry.SyntaxError(state.locale.t(key));
  }

  get currentBranch() {
    return this.branches[this.branches.length - 1];
  }

  get raw() {
    return `${this.tag_name || this.name} ${this.value}`;
  }

  get tag_name() {
    return this.name;
  }

  get tag_end_name() {
    return `end${this.name}`;
  }
}

module.exports = BlockTag;
