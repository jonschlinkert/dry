'use strict';

const Dry = require('../Dry');
const Condition = require('../Condition');
const { constants, shared, utils } = Dry;
const { selectParser: { parse_with_selected_parser } } = shared;
const { regex: { QuotedFragment: q } } = constants;
const { r, scan } = utils;

const BOOLEAN_OPERATORS = new Set(['and', 'or']);

class If extends Dry.BlockTag {
  static OperatorSyntax = /^(===?|!==?|<>|>=?|<=?|(?:and|contains|or))(?!\w)/;
  // static ExpressionSyntax = /^\s*(.*?)\s*(===?|!==?|<>|>=?|<=?|(?:and|contains|or))(?!\w)\s*(.*)$/;
  static ConditionsSyntax = r`(${q})\\s*([=!<>a-z_]+)?\\s*(${q})?`;
  static ExpressionsAndOperators = r`(?:\\b(?:\\s*and\\s*|\\s*or\\s*)\\b|(?:\\s*(?!\\b(?:\\s*and\\s*|\\s*or\\s*)\\b)(?:${q}|\\S+)\\s*)+)`;

  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];
    this.branches = [];
    this.params = [];
    this.parsed = {};
  }

  push(node) {
    super.push(node);

    if (node.type !== 'close') {
      this.push_branch(node);
    }

    if (node.type === 'open') {
      this.markup = node.markup;
      node.parse();
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
    return parse_with_selected_parser(this, markup);
  }

  lax_parse(markup = this.markup) {
    const expressions = scan(markup, If.ExpressionsAndOperators);
    let last = expressions.pop();
    let match = last && If.ConditionsSyntax.exec(last.input.trim());

    if (!match) return this.raise_syntax_error('errors.syntax.if');

    let left = this.parse_expression(match[1]);
    let right = this.parse_expression(match[3]);
    let condition = new Condition(left, match[2], right);

    while (expressions.length) {
      const operator = expressions.pop().toString().trim();
      last = expressions.pop();
      match = If.ConditionsSyntax.exec(last.toString().trim());
      if (!match) return this.raise_syntax_error('errors.syntax.if');

      left = this.parse_expression(match[1]);
      right = this.parse_expression(match[3]);
      const new_condition = new Condition(left, match[2], right);

      if (!BOOLEAN_OPERATORS.has(operator)) {
        return this.raise_syntax_error('errors.syntax.if');
      }

      new_condition[operator](condition);
      condition = new_condition;
    }

    return condition;
  }

  strict_parse(markup = this.markup) {
    if (typeof markup !== 'string') markup = this.value;

    const parser = new Dry.expressions.Parser(markup);
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

    if (left && left.name === 'typeof') {
      left.value = parser.accept('id');
    }

    const operator = parser.accept('comparison');
    if (operator) {
      const right = this.parse_expression(parser.expression());
      return new Condition(left, operator, right);
    }

    return new Condition(left);
  }

  parse_expression(markup = this.markup) {
    return Condition.parse_expression(this.state, markup);
  }

  parse_args(branch, context) {
    const index = branch.args.findIndex(arg => If.OperatorSyntax.test(arg.value));
    let markup = branch.markup;

    if (index === 3) {
      const args = branch.args.slice(0, index);
      const condition = this.parse(args.join(' '));
      const left = condition.evaluate(context);
      markup = `${left} ${branch.args.slice(index + 1).join(' ')}`;
    } else {
      markup = branch.args.join(' ');
    }

    return markup;
  }

  evaluate_branch(branch, context) {
    return branch.evaluate(context);
  }

  render_to_output_buffer(context) {
    utils.trim_whitespace(this.nodes[this.nodes.length - 1]);

    for (const branch of this.branches) {
      if (branch.name === 'else') return branch.render(context);

      const markup = this.parse_args(branch, context);
      branch.condition = this.parse(markup);

      if (this.evaluate_branch(branch, context)) {
        return branch.render(context);
      }
    }
  }

  async render(context) {
    const output = await this.render_to_output_buffer(context);

    if (output && this.parent.type === 'root' && this.blank && output.trim() === '') {
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
    return class ParseTreeVisitor extends Dry.ParseTreeVisitor {
      get children() {
        return this.node.blocks;
      }
    };
  }
}

module.exports = If;
