
const Dry = require('../Dry');
const { QuotedFragment: q } = Dry.regex;

/**
 * The `case` tag works like a switch statement, and the `when` tag
 * is used for comparing values.
 *
 * == Basic Usage:
 *    {% case handle %}
 *    {% when 'cake' %}
 *      This is a cake
 *    {% when 'cookie' %}
 *      This is a cookie
 *    {% else %}
 *      This is not a cake nor a cookie
 *    {% endcase %}
 */

class Case extends Dry.BlockTag {
  static Syntax = Dry.utils.r`(${q})`;
  static WhenSyntax = Dry.utils.r('m')`(${q})(?:(?:\\s+or\\s+|\\s*\\,\\s*)(${q}.*))?`;

  constructor(node, state, parent) {
    super(node, state, parent);
    this.markup = this.match[3];
    this.branches = [];
    this.blocks = [];

    if (this.ParseSyntax(this.markup, Case.Syntax)) {
      this.left = this.parse_expression(this.last_match[1]);
    } else {
      this.raise_syntax_error('case');
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

  async render(context) {
    if (this.branches.length <= 1) return this.raise_syntax_error('case');

    for (const branch of this.branches.slice(1)) {
      this.blank &&= branch.blank;

      if (branch.name === 'else') return branch.render(context);

      if (!/( (or|\|\||and|&&) |,|\(|\.\.)/.test(branch.markup)) {
        branch.condition = new Dry.Condition(this.left, '==', this.parse_expression(branch.markup), this);

        if (await this.evaluate_branch(branch, context)) {
          return branch.render(context);
        }

      } else {
        for (const block of this.record_when_condition(this.left, branch.markup)) {
          if (await this.evaluate_branch(block, context)) {
            return branch.render(context);
          }
        }
      }
    }
  }

  record_when_condition(left, markup) {
    const blocks = [];

    while (markup) {
      if (!this.ParseSyntax(markup, Case.WhenSyntax)) {
        return this.raise_syntax_error('case_invalid_when');
      }

      let value = this.last_match[1];
      if (value && markup && value.includes('..') && markup.startsWith('(') && markup.endsWith(')')) {
        value = markup;
      }

      markup = this.last_match[2];
      const right = Dry.Condition.parse_expression(this.state, value);
      const block = new Dry.Condition(left, '==', right, this);
      // block.attach(this.new_body());
      blocks.push(block);
    }

    return blocks;
  }

  record_else_condition(markup) {
    if (Dry.utils.toString(markup).trim() !== '') {
      return this.raise_syntax_error('case_invalid_else');
    }

    const block = new Dry.Condition.ElseCondition();
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
