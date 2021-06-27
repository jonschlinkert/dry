'use strict';

const path = require('path');
const Dry = require('../Dry');

class Root extends Dry.BlockTag {
  constructor(node, state) {
    super(node, state);
    this.type = 'root';
    this.depth = 0;
  }

  get nodelist() {
    return this.nodes;
  }

  async render_with_layout(context, data) {
    const { layouts } = context.registers;
    const stem = path.basename(data.layout, path.extname(data.layout));
    const layout = layouts[data.layout] || layouts[stem];

    if (!layout) {
      throw new Dry.Error(`Cannot find layout: ${data.layout}`);
    }

    const layout_factory = (context.registers['layout_factory'] ||= new Dry.TemplateFactory());
    const template = layout_factory.for(data.layout);
    const partial = template.parse(layout.contents, this.state);
    const content = await this.render_inner(context);
    context.merge({ content });

    return partial.render(context);
  }

  render(context, output) {
    if (this.nodes[0] && this.nodes[0].type === 'front_matter') {
      const node = this.nodes.shift();
      const data = node.parse();

      if (data.layout) {
        return this.render_with_layout(context, data);
      }

      context.merge(data);
    }

    return super.render(context, output);
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
