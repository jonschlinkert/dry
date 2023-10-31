
const Node = require('./Node');

class Text extends Node {
  constructor(node, state, parent) {
    super(node, state, parent);
    this.type = node.type || 'text';
    this.blank = false;
  }

  parse() {}

  render(context) {
    try {
      context.resource_limits.increment_render_score(this.value.length);
    } catch (error) {
      return context.handle_error(error);
    }
    return this.value;
  }
}

module.exports = Text;
