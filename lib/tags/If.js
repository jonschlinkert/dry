'use strict';

const Parser = require('../expression/Parser');
const { parse_with_selected_parser } = require('../select-parser');
const { BlockTag, Conditional } = require('../nodes');
const { regex: { QUOTED_FRAGMENT } } = require('../constants');
const { r, scan } = require('../utils');

const IF_SYNTAX = r`(${QUOTED_FRAGMENT})\\s*([=!<>a-z_]+)?\\s*(${QUOTED_FRAGMENT})?`;
const EXPRESSIONS_AND_OPERATORS = r`(?:\\b(?:\\s*and\\s*|\\s*or\\s*)\\b|(?:\\s*(?!\\b(?:\\s*and\\s*|\\s*or\\s*)\\b)(?:${QUOTED_FRAGMENT}|\\S+)\\s*)+)`;
const BOOLEAN_OPERATORS = new Set(['and', 'or']);

class If extends BlockTag {
  constructor(token, state) {
    super(token, state);
    this.options = { locale: { t: () => {} }, error_mode: 'strict' };
    this.branches = [];
    this.params = [];
    this.parsed = {};
  }

  parse(markup) {
    return parse_with_selected_parser(this, markup);
  }

  lax_parse(markup) {
    const expressions = scan(markup, EXPRESSIONS_AND_OPERATORS);
    let last = expressions.pop();
    let match = IF_SYNTAX.exec(last.input.trim());

    if (!match) throw new SyntaxError(this.options.locale.t('errors.syntax.if'));

    let left = this.parse_expression(match[1]);
    let right = this.parse_expression(match[3]);
    let condition = new Conditional(left, match[2], right);

    while (expressions.length) {
      const operator = expressions.pop().toString().trim();
      last = expressions.pop();
      match = IF_SYNTAX.exec(last.toString().trim());
      if (!match) throw new SyntaxError(this.options.locale.t('errors.syntax.if'));

      left = this.parse_expression(match[1]);
      right = this.parse_expression(match[3]);
      const new_condition = new Conditional(left, match[2], right);

      if (!BOOLEAN_OPERATORS.has(operator)) {
        throw new SyntaxError(this.options.locale.t('errors.syntax.if'));
      }

      new_condition[operator](condition);
      condition = new_condition;
    }

    return condition;
  }

  strict_parse(markup) {
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
      return new Conditional(left, operator, right);
    }

    return new Conditional(left);
  }

  parse_expression(markup) {
    return Conditional.parse_expression(markup);
  }

  evaluate_branch(branch, context) {
    return branch.evaluate(context);
  }

  render(context) {
    for (const branch of this.branches) {
      if (branch.name === 'else') return branch.render(context);

      branch.conditional = this.parse(branch.conditional.left.value);

      if (this.evaluate_branch(branch, context)) {
        return branch.render(context);
      }
    }
  }
}

module.exports = If;
