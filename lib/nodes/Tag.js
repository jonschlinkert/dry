'use strict';

const Node = require('./Node');
const Dry = require('../Dry');

class Tag extends Node {
  constructor(node, state) {
    super(node);
    this.type = 'tag';
  }

  Syntax(markup, regex) {
    return (this.last_match = regex.exec(markup));
  }

  raise_syntax_error(state, key) {
    return this.constructor.raise_syntax_error(state, key);
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

  static raise_syntax_error(state, key) {
    throw new Dry.SyntaxError(state.locale.t(key));
  }
}

module.exports = Tag;
