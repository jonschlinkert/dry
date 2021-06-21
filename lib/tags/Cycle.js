'use strict';

const Dry = require('../Dry');
const Tag = require('../nodes/Tag');
const { QUOTED_FRAGMENT } = Dry.regex;
const { r, to_integer } = Dry.utils;

const kCycle = Symbol(':cycle');

// Cycle is usually used within a loop to alternate between values, like colors or DOM classes.
//
//   {% for item in items %}
//     <div class="{% cycle 'red', 'green', 'blue' %}"> {{ item }} </div>
//   {% } %}
//
//    <div class="red"> Item one </div>
//    <div class="green"> Item two </div>
//    <div class="blue"> Item three </div>
//    <div class="red"> Item four </div>
//    <div class="green"> Item five</div>
//
class Cycle extends Tag {
  SimpleSyntax = r`^${QUOTED_FRAGMENT}+`;
  NamedSyntax = r('m')`^(${QUOTED_FRAGMENT})\\s*\\:\\s*(.*)`;
  StringSyntax = r`\\s*(${QUOTED_FRAGMENT})\\s*`;

  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];
    this.parse(this.markup);
  }

  parse(markup) {
    // console.log(this)
    if (this.Syntax(markup, this.NamedSyntax)) {
      this.variables = this.variables_from_string(this.last_match[2]);
      this.name = Dry.Expression.parse(this.last_match[1]);
    } else if (this.Syntax(markup, this.SimpleSyntax)) {
      this.variables = this.variables_from_string(markup);
      this.name = this.variables.toString();
    } else {
      throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.cycle'));
    }
  }

  render(context) {
    const cycle = (context.registers['cycle'] ||= {});
    const key = context.evaluate(this.name);

    let iteration = to_integer(cycle[key] || 0);
    let output = context.evaluate(this.variables[iteration]);

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
      const match = this.StringSyntax.exec(variable);
      return match[1] ? Dry.Expression.parse(match[1]) : null;
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
