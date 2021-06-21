'use strict';

const Dry = require('../Dry');
const { Condition, Expression } = Dry;
const { QuotedFragment: q } = Dry.regex;

class Case extends Dry.BlockTag {
  CaseSyntax = Dry.utils.r`(${q})`;
  WhenSyntax = Dry.utils.r('m')`(${q})(?:(?:\\s+or\\s+|\\s*\\,\\s*)(${q}.*))?`;

  constructor(node, state) {
    super(node, state);
    this.blocks = [];
    this.branches = [];
    this.markup = this.match[3];

    if (this.Syntax(this.markup, this.CaseSyntax)) {
      this.left = Expression.parse(this.last_match[1]);
    } else {
      throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.case'));
    }
  }

  push(node) {
    super.push(node);
    this.push_branch(node);

    if (node.type === 'close') {
      this.parse();
    }
  }

  push_branch(node) {
    if (!this.branches) return;
    if (node.type === 'close') return;
    if (node.type === 'open') node.name = 'main';
    if (node.name === 'main' || node.name === 'when' || node.name === 'else') {
      if (node.parse) node.parse();
      this.branches.push(new Dry.nodes.Branch(node));
      return;
    }

    if (this.currentBranch) {
      this.currentBranch.push(node);
    }
  }

  parse() {
    // console.log(this.branches);

    // for (const node of this.nodes.slice(1, -1)) {
    //   this.parse_node(node.name, node.markup, node);
    // }

    // let body = this.case_body = this.new_body();

    // while (this.parse_body(body)) body = this.blocks.last.attachment;

    // for (const condition of this.blocks.slice().reverse()) {
    //   body = condition.attachment;

    //   if (!body.frozen) {
    //     if (this.blank) body.remove_blank_strings();
    //     body.freeze();
    //   }
    // }

    // this.case_body.freeze();
  }

  // get nodes() {
  //   return this.blocks.map(node => node.attachment);
  // }

  parse_node(tag_name, markup, node) {
    switch (tag_name) {
      case 'else': return this.parse_else_condition(markup, node);
      case 'when': return this.parse_when_condition(markup, node);
      default: return super.unknown_tag(markup, node);
    }
  }

  // parse_branch(branch) {
  //   // console.log(branch);
  //   // switch (tag_name) {
  //   //   case 'else': return this.parse_else_condition(markup, node);
  //   //   case 'when': return this.parse_when_condition(markup, node);
  //   //   default: return super.unknown_tag(markup, node);
  //   // }
  // }

  parse_when_condition(left, markup) {
    const blocks = [];

    while (markup) {
      if (!this.Syntax(markup, this.WhenSyntax)) {
        throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.case_invalid_when'));
      }

      markup = this.last_match[2];
      const right = Condition.parse_expression(this.state, this.last_match[1]);
      const block = new Condition(left, '==', right, this);
      // block.attach(this.new_body());
      blocks.push(block);
    }

    return blocks;
  }

  parse_else_condition(markup) {
    if (Dry.utils.toString(markup).trim() !== '') {
      throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.case_invalid_else'));
    }
    return new Condition.ElseCondition();
  }

  evaluate_branch(branch, context) {
    return branch.evaluate(context);
  }

  render(context) {
    if (this.branches.length <= 1) {
      throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.case'));
    }

    for (const branch of this.branches.slice(1)) {
      if (branch.name === 'else') {
        return branch.render(context);
      }

      if (!/( (or|and) |,|\(|\.\.)/.test(branch.markup)) {
        branch.condition = new Condition(this.left, '==', Expression.parse(branch.markup), this);

        if (branch.evaluate(context)) {
          return branch.render(context);
        }
      } else {
        for (const block of this.parse_when_condition(this.left, branch.markup)) {
          if (block.evaluate(context)) {
            return branch.render(context);
          }
        }
      }
    }
  }

  get nodelist() {
    return this.branches.map(branch => branch.nodelist).flat().filter(Boolean);
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  get children() {
    return [this.node.left].concat(this.node.blocks);
  }
}

module.exports = Case;
