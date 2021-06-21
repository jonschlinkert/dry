'use strict';

const Dry = require('../Dry');
const Parser = require('../expressions/Parser');

const ToSyntax = /^\(?(@?[[\]\w$.-]+)\)?\s*$/;
const AssignSyntax = new RegExp(`${ToSyntax.source.slice(0, -1)}\\s*=\\s*([\\s\\S]*)\\s*`, 'm');

class Assign extends Dry.Tag {
  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3] || this.value;
  }

  parse(context) {
    if (this.Syntax(this.markup, AssignSyntax)) {
      this.to = this.last_match[1];
      this.from = this.parse_args(this.last_match[2], context);
    } else {
      this.raise_syntax_error('errors.syntax.assign');
    }
  }

  // strict_parse(markup = this.markup) {
  //   if (typeof markup !== 'string') markup = this.value;

  //   const parser = new Parser(markup);
  //   const condition = this.parse_binary_comparisons(parser);
  //   parser.consume('end_of_string');
  //   return condition;
  // }

  // parse_binary_comparisons(parser) {
  //   let condition = this.parse_comparison(parser);
  //   const first_condition = condition;
  //   let operator;

  //   while ((operator = parser.id('and') || parser.id('or'))) {
  //     const child_condition = this.parse_comparison(parser);
  //     condition[operator](child_condition);
  //     condition = child_condition;
  //   }

  //   return first_condition;
  // }

  // parse_comparison(parser) {
  //   const left = this.parse_expression(parser.expression());
  //   const operator = parser.accept('comparison');

  //   if (operator) {
  //     const right = this.parse_expression(parser.expression());
  //     return new Dry.Condition(left, operator, right);
  //   }

  //   return new Dry.Condition(left);
  // }

  parse_args(variable, context) {
    // try {

    // console.log(this.parse(variable));
    // } catch (error) {

    // }

    const args = this.args.slice(2);
    const pipe = args.findIndex(arg => arg === '|');
    let filters;

    if (pipe > -1) {
      filters = args.splice(pipe + 1);
      args.pop();
    }

    if (args.length > 1 && !args.some(v => v === '|' || /[[\]]/.test(v))) {
      const markup = args.join(' ');

      if (args.length > 1) {
        const conditional = new Dry.tags.If({}, this.state);
        const condition = conditional.parse(markup);
        variable = String(condition.evaluate(context));
      }
    }

    if (filters) {
      variable += `| ${filters.join(' ')}`;
    }

    return new Dry.Variable(variable, this.state, context);
  }

  render(context) {
    this.parse(context);
    const value = this.from.render(context);
    context.set(this.to, value);
    context.push();
    context.resource_limits.increment_assign_score(this.assign_score_of(value));
    return '';
  }

  assign_score_of(val) {
    if (typeof val === 'string') {
      return Buffer.from(val).length;
    }

    if (Array.isArray(val)) {
      return val.reduce((sum, child) => sum + this.assign_score_of(child), 1);
    }

    if (Dry.utils.isObject(val)) {
      let sum = 1;
      for (const [k, v] of Object.entries(val)) {
        sum += this.assign_score_of(k) + this.assign_score_of(v);
      }
      return sum;
    }

    return 1;
  }

  get blank() {
    return true;
  }
}

module.exports = Assign;
