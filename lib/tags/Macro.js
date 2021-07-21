'use strict';

const Dry = require('../Dry');
const { regex, utils } = Dry;

/**
 * The Macro tag allows you to define inline functions.
 *
 *   {% macro name(a, b=true, c=variable, d) %}
 *     a: {{a}}
 *     b: {{b}}
 *     c: {{c}}
 *     d: {{d}}
 *   {% endmacro %}
 *
 */

class Macro extends Dry.BlockTag {
  static Syntax = utils.r`(${regex.QuotedFragment}+)\\s*\\((.*?)\\)`;

  push(node) {
    super.push(node);

    if (node.type === 'open') {
      this.markup = this.match[3];
      this.parse();
    }
  }

  parse() {
    if (this.ParseSyntax(this.markup, Macro.Syntax)) {
      const template_name   = this.last_match[1];
      const template_params = this.last_match[2];

      this.template_name      = template_name;
      this.template_name_expr = this.parse_expression(template_name);
      this.params             = [];

      this.parse_params(template_params);
      this.state.registry.macros[template_name] = this;
    } else {
      this.raise_syntax_error('macro');
    }
  }

  parse_params(markup) {
    const p = new Dry.expressions.Parser(markup);

    while (!p.eos()) {
      const param = this.parse_param(p);
      this.params.push(param);
      p.accept('comma');
    }

    p.consume('end_of_string');
  }

  parse_param(p) {
    const param = this.parse_expression(p.expression());

    if (p.accept('equal')) {
      return { param, fallback: this.parse_expression(p.expression()) };
    }

    return { param };
  }

  render(context) {
    return '';
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  Parent = Macro;
  get children() {
    return this.node.nodes;
  }
}

module.exports = Macro;

