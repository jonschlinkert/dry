'use strict';

const Dry = require('../Dry');
const { regex: { QuotedFragment: q, VariableSegment: v }, utils: { r } } = Dry;

class Block extends Dry.BlockTag {
  static BlockSyntax = r`(${q}+)(?:\\s+(${v}+)(?:=(.*)))?`;

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
    if (this.parsed) return;
    this.parsed = true;
    this.markup = this.match[3];

    if (this.Syntax(this.markup, Block.BlockSyntax)) {
      const template_name = this.last_match[1];
      const template_mode = this.last_match[3];

      this.template_name      = template_name;
      this.template_name_expr = this.parse_expression(template_name);
      this.mode               = template_mode && this.parse_expression(template_mode);

      this.parent.registry ||= {};
      this.parent.registry[template_name] = this;
      this.state.blocks.set(template_name, this);

    } else {
      this.raise_syntax_error('errors.syntax.block');
    }
  }

  render(context) {
    const name = context.evaluate(this.template_name_expr) || this.template_name;
    const block = context.blocks && context.blocks[name] || this;
    const output = block.render_inner(context);

    if (block === this) {
      return output;
    }

    switch (block.mode) {
      case 'append': return this.render_inner(context) + output;
      case 'prepend': return output + this.render_inner(context);
      case 'replace':
      default: {
        return output;
      }
    }
  }
}

module.exports = Block;
