'use strict';

const Dry = require('../Dry');
const Condition = require('../Condition');
// const expressions = require('../../expressions');
const { constants, regex: { QuotedFragment: q }, shared, utils } = Dry;

const BOOLEAN_OPERATORS = new Set(['and', 'or']);

class If extends Dry.BlockTag {
  static Syntax = utils.r`(${q})\\s*([=!<>a-z_%^&*~+/-]+)?\\s*(${q})?`;
  static ExpressionsAndOperators = utils.r('g')`(?:\\b(?:\\s?and\\s?|\\s?or\\s?)\\b|(?:\\s*(?!\\b(?:\\s?and\\s?|\\s?or\\s?)\\b)(?:${q}|\\S+)\\s*)+)`;

  constructor(node, state) {
    super(node, state);
    this.branches = [];
    this.params = [];
    this.parsed = {};
  }

  push(node) {
    super.push(node);

    if (node.type !== 'close') {
      this.push_branch(node);
    }
  }

  push_branch(node) {
    if (!this.branches) return;
    if (node.type === 'open') node.name = 'main';
    if (node.name === 'main' || node.name === 'else' || node.name === 'elsif') {
      this.branches.push(new Dry.nodes.Branch(node));
      return;
    }

    if (this.currentBranch) {
      this.currentBranch.body.push(node);
    }
  }

  parse(markup = this.markup) {
    return shared.parse_with_selected_parser(this, markup);
  }

  lax_parse(markup = this.markup) {
    const expressions = markup.match(If.ExpressionsAndOperators);
    if (!expressions) return this.raise_syntax_error('if');

    const parse_condition = exp => {
      const m = If.Syntax.exec(exp);
      if (!m) return this.raise_syntax_error('if');
      return new Condition(this.parse_expression(m[1]), m[2], this.parse_expression(m[3]));
    };

    let condition = parse_condition(expressions?.pop());

    while (expressions.length > 0) {
      const operator = expressions.pop().trim();
      const new_condition = parse_condition(expressions.pop());

      if (!BOOLEAN_OPERATORS.has(operator)) return this.raise_syntax_error('if');
      new_condition[operator](condition);
      condition = new_condition;
    }

    return condition;
  }

  strict_parse(markup = this.markup) {
    if (typeof markup !== 'string') markup = this.value;
    const expression = markup;
    const parser = new Dry.expressions.Parser(expression);
    const condition = this.parse_binary_comparisons(parser);
    condition.markup = expression;
    parser.consume('end_of_string');
    return condition;
  }

  parse_binary_comparisons(parser) {
    const condition = this.parse_comparison(parser);
    let operator;
    let c = condition;

    while ((operator = parser.id('and') || parser.id('or'))) {
      const child_condition = this.parse_comparison(parser);
      c[operator](child_condition);
      c = child_condition;
    }

    return condition;
  }

  parse_comparison(parser) {
    const left = this.parse_expression(parser.expression());

    if (left && left.name === 'typeof') {
      left.value = parser.accept('id');
    }

    const comparison = parser.accept('comparison');
    if (comparison) {
      const right = this.parse_expression(parser.expression());
      return new Condition(left, comparison, right);
    }

    const operator = parser.accept('operator');
    if (operator) {
      const right = this.parse_expression(parser.expression());
      return new Condition(left, operator, right);
    }

    return new Condition(left);
  }

  parse_expression(markup = this.markup) {
    return Condition.parse_expression(this.state, markup);
  }

  async parse_args(branch, context) {
    if (branch.parsed_args) return branch.markup;
    const operators = constants.REVERSE_OPERATOR;
    const args = [];

    for (let i = 0; i < branch.args.length; i++) {
      const next = branch.args[i + 1];
      const prev = branch.args[i - 1];

      let v = branch.args[i];
      if (v === 'is' && prev && !hasOwnProperty.call(operators, prev)) v = '===';
      if (v === 'isnt' && prev && !hasOwnProperty.call(operators, prev)) v = '!==';
      if (v === 'not' && next && !hasOwnProperty.call(operators, next)) {
        branch.args[i + 1] = `!${next}`;
        continue;
      }
      if (next === 'defined' && (await context.get('defined')) === undefined) {
        v = operators[v];
        branch.args[i + 1] = 'undefined';
      }
      args.push(v);
    }

    branch.parsed_args = true;
    branch.markup = args.join(' ');
    branch.args = args;
    return branch.markup;
  }

  async evaluate_branch(branch, context) {
    return branch.evaluate(context);
  }

  async render_to_output_buffer(context) {
    try {
      for (const branch of this.branches) {
        if (branch.name === 'else') return branch.render(context);

        const markup = await this.parse_args(branch, context);
        branch.condition = await this.parse(markup);

        // const result = await expressions.evaluate(markup, context);
        // console.log({ markup, result });

        if (await this.evaluate_branch(branch, context)) {
          return branch.render(context);
        }
      }
    } catch (error) {
      return context.handle_error(error);
    }

    return '';
  }

  async render(context) {
    const output = await this.render_to_output_buffer(context);

    if (this.parent.type === 'root' && this.blank && output?.trim() === '') {
      return '';
    }

    return output;
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

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  get children() {
    return this.node.branches.map(b => b.markup);
  }
}

module.exports = If;
