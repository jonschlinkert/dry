'use strict';

const Dry = require('../Dry');
const Condition = require('../Condition');
const Parser = require('../expressions/Parser');
const { constants, nodes, shared, utils } = Dry;
const { selectParser: { parse_with_selected_parser } } = shared;
const { Branch, BlockTag } = nodes;
const { regex: { QUOTED_FRAGMENT } } = constants;
const { r, scan } = utils;

const EXPRESSIONS_AND_OPERATORS = r`(?:\\b(?:\\s*and\\s*|\\s*or\\s*)\\b|(?:\\s*(?!\\b(?:\\s*and\\s*|\\s*or\\s*)\\b)(?:${QUOTED_FRAGMENT}|\\S+)\\s*)+)`;
const BOOLEAN_OPERATORS = new Set(['and', 'or']);

class If extends BlockTag {
  IfSyntax = r`(${QUOTED_FRAGMENT})\\s*([=!<>a-z_]+)?\\s*(${QUOTED_FRAGMENT})?`;

  constructor(node, state) {
    super(node, state);
    this.branches = [];
    this.params = [];
    this.parsed = {};
  }

  get markup() {
    return this.nodes[0].markup;
  }

  push(node) {
    super.push(node);
    this.push_branch(node);

    if (node.type === 'close') {
      // utils.trim_whitespace_right(this.nodes[0]);
    }

    if (node.type === 'open') {
      // utils.trim_whitespace_left(node);
      node.parse();
    }
  }

  push_branch(node) {
    if (!this.branches) return;
    if (node.type === 'open') node.name = 'main';
    if (node.name === 'main' || node.name === 'else' || node.name === 'elsif') {
      this.branches.push(new Branch(node));
      return;
    }

    if (this.currentBranch) {
      this.currentBranch.body.push(node);
    }
  }

  parse(markup = this.markup) {
    return parse_with_selected_parser(this, markup);
  }

  lax_parse(markup = this.markup) {
    const expressions = scan(markup, EXPRESSIONS_AND_OPERATORS);
    let last = expressions.pop();
    let match = last && this.IfSyntax.exec(last.input.trim());

    if (!match) throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.if'));

    let left = this.parse_expression(match[1]);
    let right = this.parse_expression(match[3]);
    let condition = new Condition(left, match[2], right);

    while (expressions.length) {
      const operator = expressions.pop().toString().trim();
      last = expressions.pop();
      match = this.IfSyntax.exec(last.toString().trim());
      if (!match) throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.if'));

      left = this.parse_expression(match[1]);
      right = this.parse_expression(match[3]);
      const new_condition = new Condition(left, match[2], right);

      if (!BOOLEAN_OPERATORS.has(operator)) {
        throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.if'));
      }

      new_condition[operator](condition);
      condition = new_condition;
    }

    return condition;
  }

  strict_parse(markup = this.markup) {
    const parser = new Parser(markup);
    const condition = this.parse_binary_comparisons(parser);
    parser.consume('end_of_string');
    return condition;
  }

  parse_binary_comparisons(parser) {
    let condition = this.parse_comparison(parser);
    const first_condition = condition;
    let operator;

    while ((operator = parser.id('and') || parser.id('or'))) {
      const child_condition = this.parse_comparison(parser);
      condition[operator](child_condition);
      condition = child_condition;
    }

    return first_condition;
  }

  parse_comparison(parser) {
    const left = this.parse_expression(parser.expression());
    const operator = parser.accept('comparison');

    if (operator) {
      const right = this.parse_expression(parser.expression());
      return new Condition(left, operator, right);
    }

    return new Condition(left);
  }

  parse_expression(markup = this.markup) {
    return Condition.parse_expression(markup);
  }

  evaluate_branch(branch, context) {
    return branch.evaluate(context);
  }

  render(context) {
    utils.trim_whitespace(this.nodes[this.nodes.length - 1]);

    for (const branch of this.branches) {
      if (branch.name === 'else') return branch.render(context);

      branch.condition = this.parse(branch.markup);

      if (this.evaluate_branch(branch, context)) {
        return branch.render(context);
      }
    }
  }

  get nodelist() {
    const ignore = new Set(['close', 'open', 'else', 'elsif']);
    const nodes = [];
    for (const node of this.nodes) {
      if (!ignore.has(node.type) && !ignore.has(node.name)) {
        nodes.push(node.value);
      }
    }
    return nodes;
  }
}

module.exports = If;
