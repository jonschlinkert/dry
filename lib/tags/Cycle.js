'use strict';

const Dry = require('../Dry');
const { regex: { QuotedFragment: q }, utils: { r, to_integer } } = Dry;

/**
 * Cycle is usually used within a loop to alternate between values, like colors or DOM classes.
 *
 *   {% for item in items %}
 *     <div class="{% cycle 'red', 'green', 'blue' %}"> {{ item }} </div>
 *   {% endfor %}
 *
 *   <div class="red"> Item one </div>
 *   <div class="green"> Item two </div>
 *   <div class="blue"> Item three </div>
 *   <div class="red"> Item four </div>
 *   <div class="green"> Item five</div>
 */

class Cycle extends Dry.Tag {
  static SimpleSyntax = r`^${q}+`;
  static NamedSyntax = r('m')`^(${q})\\s*\\:\\s*(.*)`;
  static StringSyntax = r`\\s*(${q})\\s*`;

  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];
    this.blank = false;
    this.parse(this.markup);
  }

  parse(markup) {
    if (this.ParseSyntax(markup, Cycle.NamedSyntax)) {
      this.variables = this.variables_from_string(this.last_match[2]);
      this.name = this.parse_expression(this.last_match[1]);
      return;
    }

    if (this.ParseSyntax(markup, Cycle.SimpleSyntax)) {
      this.variables = this.variables_from_string(markup);
      this.name = this.variables.toString();
    } else {
      this.raise_syntax_error('cycle');
    }
  }

  async render(context) {
    const cycle = (context.registers['cycle'] ||= {});
    const key = await context.evaluate(this.name);

    let iteration = to_integer(cycle[key] || 0);
    let output = await context.evaluate(this.variables[iteration]);

    if (Array.isArray(output)) {
      output = output.join(' ');
    } else if (typeof output !== 'string') {
      output = String(output == null ? ' ' : output);
    }

    iteration = iteration >= this.variables.length - 1 ? 0 : iteration + 1;
    cycle[key] = iteration;
    return output;
  }

  variables_from_string(markup) {
    const variables = markup.split(',').map(variable => {
      const match = Cycle.StringSyntax.exec(variable);
      return match[1] ? this.parse_expression(match[1]) : null;
    });
    return variables.filter(v => v != null);
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  get children() {
    return Array.from(this.node.variables);
  }
}

module.exports = Cycle;
