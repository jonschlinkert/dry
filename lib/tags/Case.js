'use strict';

const Dry = require('../Dry');
const { Condition } = Dry;
const { QuotedFragment: q } = Dry.regex;

class Case extends Dry.BlockTag {
  static Syntax = Dry.utils.r`(${q})`;
  static WhenSyntax = Dry.utils.r('m')`(${q})(?:(?:\\s+or\\s+|\\s*\\,\\s*)(${q}.*))?`;

  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];
    this.branches = [];
    this.blocks = [];

    if (this.Syntax(this.markup, Case.Syntax)) {
      this.left = this.parse_expression(this.last_match[1]);
    } else {
      this.raise_syntax_error('errors.syntax.case');
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

  parse() {}

  parse_node(tag_name, markup, node) {
    switch (tag_name) {
      case 'else': return this.record_else_condition(markup, node);
      case 'when': return this.record_when_condition(markup, node);
      default: return super.unknown_tag(markup, node);
    }
  }

  // parse_branch(branch) {
  //   switch (tag_name) {
  //     case 'else': return this.record_else_condition(markup, node);
  //     case 'when': return this.record_when_condition(markup, node);
  //     default: return super.unknown_tag(markup, node);
  //   }
  // }

  evaluate_branch(branch, context) {
    return branch.evaluate(context);
  }

  render(context) {
    if (this.branches.length <= 1) return this.raise_syntax_error('errors.syntax.case');

    for (const branch of this.branches.slice(1)) {
      this.blank &&= branch.blank;

      if (branch.name === 'else') return branch.render(context);

      if (!/( (or|and) |,|\(|\.\.)/.test(branch.markup)) {
        branch.condition = new Condition(this.left, '==', this.parse_expression(branch.markup), this);
        if (branch.evaluate(context)) return branch.render(context);
        continue;
      }

      for (const block of this.record_when_condition(this.left, branch.markup)) {
        if (block.evaluate(context)) {
          return branch.render(context);
        }
      }
    }
  }

  record_when_condition(left, markup) {
    const blocks = [];

    while (markup) {
      if (!this.Syntax(markup, Case.WhenSyntax)) {
        return this.raise_syntax_error('errors.syntax.case_invalid_when');
      }

      let value = this.last_match[1];
      if (value && markup && value.includes('..') && markup.startsWith('(') && markup.endsWith(')')) {
        value = markup;
      }

      markup = this.last_match[2];
      const right = Condition.parse_expression(this.state, value);
      const block = new Condition(left, '==', right, this);
      // console.log(block);
      // block.attach(this.new_body());
      blocks.push(block);
    }

    return blocks;
  }

  record_else_condition(markup) {
    if (Dry.utils.toString(markup).trim() !== '') {
      return this.raise_syntax_error('errors.syntax.case_invalid_else');
    }

    const block = new Condition.ElseCondition();
    // console.log(block);
    return block;
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
    return [this.node.left].concat(this.node.nodelist);
  }
}

module.exports = Case;
