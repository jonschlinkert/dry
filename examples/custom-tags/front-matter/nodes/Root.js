/* eslint-disable no-case-declarations */

const Dry = require('../../..');

class Root extends Dry.BlockTag {
  constructor(node, state, parent) {
    super(node, state, parent);
    this.type = this.name = 'root';
    this.blank = true;
    this.depth = 0;
  }

  first_node() {
    return this.nodes.find(node => node.type !== 'text' || node.value.trim() !== '');
  }

  async render_with_layout(layout_name, node, nodes = [], context) {
    const layout_string = Dry.tags.Layout.toString(layout_name);
    const template = Dry.Template.parse(layout_string);
    const layout = template.root.ast.nodes.find(node => node.name === 'layout');
    return layout.render_content(nodes, context);
  }

  async render_with_front_matter(node, nodes = [], context) {
    const data = node.parse();
    const name = data.layout;

    return context.stack(data, () => {
      return name ? this.render_with_layout(name, node, nodes, context) : super.render(context);
    });
  }

  async render(context, output) {
    const node = this.first_node();
    const nodes = this.nodes.slice(this.nodes.indexOf(node));

    switch (node?.name) {
      case 'front_matter':
        return this.render_with_front_matter(node, nodes, context);
      case 'layout':
        return node.render_content(nodes, context);
      default: {
        return super.render(context, output);
      }
    }
  }

  get nodelist() {
    return this.nodes;
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  Parent = Root;
  get children() {
    return this.node.nodes.slice();
  }
}

module.exports = Root;
