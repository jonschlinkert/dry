'use strict';

const Dry = require('../Dry');
const { regex: { QuotedFragment: q }, shared, utils } = Dry;

class Block extends Dry.BlockTag {
  static BlockSyntax = utils.r`(${q}+)(?:\\s+(?:mode=(\\S+)))?(\\s+\\|(.*)$)?`;
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
      const template_mode = this.last_match[2];

      this.template_name      = template_name;
      this.template_mode      = template_mode;
      this.template_name_expr = this.parse_expression(template_name);
      this.template_mode_expr = this.parse_expression(template_mode);

      this.set_block(...this.last_match.slice(1));
    } else {
      this.raise_syntax_error('block');
    }
  }

  set_block(name, mode, filters = '') {
    if (utils.isQuoted(name)) {
      this.variable_name = utils.unquote(name);
      this.state.set_block(this.variable_name, this);
    } else {
      this.lazy_set_block(name, mode, filters);
    }
  }

  lazy_set_block(name, mode, filters) {
    const set = async context => {
      this.state.queue.delete(set);
      const block = this.clone();
      block.markup = mode ? `${name} ${filters}`.trim() : this.markup;
      const variable = new Dry.nodes.Variable(block, this.state, this);
      this.variable_name = await variable.render(context);
      this.state.set_block(this.variable_name, this);
    };
    this.state.queue.add(set);
  }

  async render_block(context) {
    const name   = await context.evaluate(this.template_name_expr);
    const blocks = await context.get('blocks');
    const block  = blocks[name] || this;

    const mode   = await context.evaluate(block.template_mode_expr);
    const output = await block.render_inner(context);

    switch (mode) {
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
