'use strict';

const Dry = require('../Dry');
const BlockTag = require('../nodes/BlockTag');

class Block extends BlockTag {
  BlockSyntax = Dry.utils.r`(${Dry.regex.QuotedFragment}+)(?:\\s+(${Dry.regex.VariableSegment}+))?`;

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

    if (this.Syntax(this.markup, this.BlockSyntax)) {
      const template_name = this.last_match[1];
      const variable_name = this.last_match[3];

      this.alias_name         = this.last_match[5];
      this.variable_name_expr = variable_name ? Dry.Expression.parse(variable_name) : null;
      this.template_name_expr = Dry.Expression.parse(template_name);
      this.attributes         = {};

      Dry.utils.scan(this.markup, Dry.regex.TagAttributes, (m, key, value) => {
        this.attributes[key] = Dry.Expression.parse(value);
      });

      this.parent.registry ||= {};
      this.parent.registry[this.markup] = this;

    } else {
      this.raise_syntax_error('errors.syntax.block');
    }
  }

  render(context) {
    const block = context.blocks && context.blocks[this.markup] || this;
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
