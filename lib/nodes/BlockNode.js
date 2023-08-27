
const Dry = require('../Dry');
const render = require('../shared/helpers/render');

class BlockNode extends Dry.Node {
  constructor(node, state, parent) {
    super(node, state, parent);
    this.nodes = [];
    this.blank = true;
  }

  push(node) {
    Reflect.defineProperty(node, 'parent', { value: this });
    this.nodes.push(node);
  }

  render_nodes(nodes = [], context, output = '') {
    return render.render_nodes(this, this.nodes, context, output);
  }

  render_inner(context, output) {
    return this.nodes ? this.render_nodes(this.nodes, context, output) : '';
  }

  render_to_output_buffer(context, output) {
    return this.render_inner(context, output);
  }

  render(context, output) {
    return this.render_to_output_buffer(context, output);
  }
}

module.exports = BlockNode;
