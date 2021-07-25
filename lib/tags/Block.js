'use strict';

const Dry = require('../Dry');
const { regex: { QuotedFragment: q, VariableSegment: v }, utils: { r } } = Dry;

class Block extends Dry.BlockTag {
  static BlockSyntax = r`(${q}+)(?:\\s+(${v}+)(?:=(.*)))?`;
  static seen = new Set();

  constructor(node, state) {
    super(node, state);
    this.type = 'block';
  }

  push(node) {
    super.push(node);

    if (node.type === 'open') {
      this.parse();
    }
  }

  parse() {
    this.markup = this.match[3];

    if (this.ParseSyntax(this.markup, Block.BlockSyntax)) {
      const template_name = this.last_match[1];
      const template_mode = this.last_match[3];

      this.template_name      = template_name;
      this.template_name_expr = this.parse_expression(template_name);
      this.template_mode      = template_mode && this.parse_expression(template_mode);

      this.state.set_block(template_name, this);
    } else {
      this.raise_syntax_error('block');
    }
  }

  async render_block(context) {
    const name = (await context.evaluate(this.template_name_expr)) || this.template_name;
    const block = await context.get(`blocks.${name}`);
    const output = await block.render_inner(context);

    switch (block.template_mode) {
      case 'append': return (await this.render_inner(context)) + output;
      case 'prepend': return output + (await this.render_inner(context));
      case 'replace':
      default: {
        return output;
      }
    }
  }

  async render(context) {
    if (this.rendering) return;
    this.rendering = true; // prevent infinite recursion

    // support calling "super()" inside block
    const parent = () => this.render_inner(context);
    const output = await context.stack({ parent }, () => this.render_block(context));
    this.rendering = false;
    return output;
  }
}

module.exports = Block;
