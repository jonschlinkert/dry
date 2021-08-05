'use strict';

const Dry = require('../Dry');
const { regex: { VariableSignature: v }, utils } = Dry;

/**
 * Assign sets a variable in your template.
 *
 *   {% assign foo = 'monkey' %}
 *
 * You can then use the variable later in the page.
 *
 *   {{ foo }}
 */

class Assign extends Dry.Tag {
  static Syntax = utils.r('m')`${v}\\s*=\\s*([\\s\\S]*)\\s*`;

  constructor(node, state) {
    super(node, state);
    this.blank = true;
    this.markup = this.match[3] || this.value;
  }

  async parse(context) {
    if (this.ParseSyntax(this.markup, Assign.Syntax)) {
      this.to   = this.last_match[1] || this.last_match[2];
      this.from = await this.parse_args(this.last_match[3], context);
    } else {
      this.raise_syntax_error('assign');
    }
  }

  async parse_args(variable, context) {
    if (variable.startsWith('[') && variable.endsWith(']')) {
      return new Dry.Variable(`assigned ${variable}`, this.state, context);
    }

    const args = this.args.slice(2);
    const pipe = args.findIndex(arg => arg === '|');
    let filters;

    if (pipe > -1) {
      filters = args.splice(pipe + 1);
      args.pop();
    }

    if (args.length > 1 && !args.includes('|') && !variable.includes('[')) {
      const conditional = new Dry.tags.If({}, this.state);
      const condition = conditional.parse(args.join(' '));
      variable = String(await condition.evaluate(context));
    }

    if (filters && !variable.includes('|')) {
      variable += `| ${filters.join(' ')}`;
    }

    return new Dry.Variable(variable, this.state, context);
  }

  async render(context) {
    await this.parse(context);
    const value = await this.from.render(context);

    context.set(this.to, value);
    context.push({});

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

    if (utils.isObject(val)) {
      let sum = 1;
      for (const [k, v] of Object.entries(val)) {
        sum += this.assign_score_of(k);
        sum += this.assign_score_of(v);
      }
      return sum;
    }

    return 1;
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  Parent = Assign;
  get children() {
    return [this.node.from];
  }
}

module.exports = Assign;
