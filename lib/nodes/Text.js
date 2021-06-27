'use strict';

const Node = require('./Node');

class Text extends Node {
  constructor(node, state) {
    super(node, state);
    this.type = node.type || 'text';
  }

  parse() {}

  render(context) {
    context.resource_limits.increment_render_score(this.value.length);
    return this.value;
  }
}

module.exports = Text;
