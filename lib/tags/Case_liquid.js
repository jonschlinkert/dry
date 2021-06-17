'use strict';

const Dry = require('../Dry');
const Block = require('../nodes/BlockTag');
const Condition = require('../Condition');
const { Expression, QUOTED_FRAGMENT: q, utils } = Dry;
const { r } = utils;

class Case extends Block {
  CaseSyntax = r`(${q})`;
  WhenSyntax = r('m')`(${q})(?:(?:\\s+or\\s+|\\s*\\,\\s*)(${q}.*))?`;

  constructor(node, state) {
    super(node, state);
    this.blocks = [];
    this.markup = this.match[2];

    if (this.Syntax(this.markup, this.CaseSyntax)) {
      this.left = Expression.parse(this.last_match[1]);
    } else {
      this.raise_syntax_error('errors.syntax.case');
    }
  }

  parse() {
    let body = this.new_body();

    while (this.parse_body(body, this.nodes)) {
      body = this.blocks[this.blocks.length - 1].attachment;
    }

    if (this.blank) {
      this.blocks.forEach(condition => condition.attachment.remove_blank_strings());
    }
  }

  get nodelist() {
    return this.blocks.map(block => block.attachment);
  }

  unknown_tag(tag_name, markup) {
    switch (tag_name) {
      case 'else': return this.record_else_condition(markup, this.nodes);
      case 'when': return this.record_when_condition(markup, this.nodes);
      default: return super.unknown_tag(tag_name, markup, this.nodes);
    }
  }

  render(context) {
    let output = '';

    for (const block of this.blocks) {
      if (block.else === true) {
        output += block.attachment.render(context);
      } else if (block.evaluate(context)) {
        output += block.attachment.render(context);
        break;
      }
    }

    return output;
  }

  record_when_condition(markup) {
    const body = this.new_body();

    while (markup) {
      const match = this.WhenSyntax.exec(markup);
      if (!match) {
        throw new Dry.SyntaxError(this.options.locale.t('errors.syntax.case_invalid_when'));
      }

      markup = match[2];
      const block = new Condition(this.left, '==', Condition.parse_expression(match[1]));
      block.attach(body);
      this.blocks.push(block);
    }

    return this.blocks;
  }

  record_else_condition(markup) {
    if (markup === undefined) {
      throw new Dry.SyntaxError(this.options.locale.t('errors.syntax.case_invalid_else'));
    }

    const block = new Condition.ElseCondition();
    block.attach(this.new_body());
    this.blocks.push(block);
    return this.blocks;
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  get children() {
    return [this.node.left, ...this.node.blocks];
  }
}

module.exports = Case;
