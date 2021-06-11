'use strict';

const Dry = require('../Dry');
const Condition = require('../Condition');
const Parser = require('../expressions/Parser');
const { constants, nodes, shared, utils } = Dry;
const { selectParser: { parse_with_selected_parser } } = shared;
const { BlockTag } = nodes;
const { regex: { QUOTED_FRAGMENT } } = constants;
const { r, scan } = utils;

const EXPRESSIONS_AND_OPERATORS = r`(?:\\b(?:\\s*and\\s*|\\s*or\\s*)\\b|(?:\\s*(?!\\b(?:\\s*and\\s*|\\s*or\\s*)\\b)(?:${QUOTED_FRAGMENT}|\\S+)\\s*)+)`;
const BOOLEAN_OPERATORS = new Set(['and', 'or']);

class If extends BlockTag {
  Syntax = r`(${QUOTED_FRAGMENT})\\s*([=!<>a-z_]+)?\\s*(${QUOTED_FRAGMENT})?`;

  constructor(node, state) {
    super(node, state);
    this.branches = [];
    this.params = [];
    this.parsed = {};
  }

  get markup() {
    return this.nodes[0].expression;
  }

  push(node) {
    super.push(node);

    if (node.type === 'open') {
      node.parse();
    }
  }

  parse(markup = this.markup) {
    return parse_with_selected_parser(this, markup);
  }

  lax_parse(markup = this.markup) {
    const expressions = scan(markup, EXPRESSIONS_AND_OPERATORS);
    let last = expressions.pop();
    let match = last && this.Syntax.exec(last.input.trim());

    if (!match) throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.if'));

    let left = this.parse_expression(match[1]);
    let right = this.parse_expression(match[3]);
    let condition = new Condition(left, match[2], right);

    while (expressions.length) {
      const operator = expressions.pop().toString().trim();
      last = expressions.pop();
      match = this.Syntax.exec(last.toString().trim());
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
    for (const branch of this.branches) {
      if (branch.name === 'else') return branch.render(context);

      branch.conditional = this.parse(branch.conditional.left.expression);

      if (this.evaluate_branch(branch, context)) {
        return branch.render(context);
      }
    }
  }
}

module.exports = If;
