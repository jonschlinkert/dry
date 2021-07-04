'use strict';

const Dry = require('../Dry');

// The Macro tag allows you to define inline functions.
//
//   {% macro name(a, b=true, c=variable, d) %}
//     a: {{a}}
//     b: {{b}}
//     c: {{c}}
//     d: {{d}}
//   {% endmacro %}
//
class Macro extends Dry.BlockTag {
  static Syntax = Dry.utils.r`(${Dry.regex.QuotedFragment}+)\\s*\\((.*?)\\)`;

  push(node) {
    super.push(node);

    if (node.type === 'open') {
      this.parse();
    }
  }

  parse() {
    this.markup = this.match[3];

    if (this.ParseSyntax(this.markup, Macro.Syntax)) {
      const macro_name   = this.last_match[1];
      const macro_params = this.last_match[2];

      this.macro_name_expr = this.parse_expression(macro_name);
      this.params = [];

      this.parse_params(macro_params);
      this.state.registry.macros[macro_name] = this;

    } else {
      this.raise_syntax_error('errors.syntax.macro');
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
    const equal = p.accept('equal');

    if (equal) {
      return { param, fallback: this.parse_expression(p.expression()) };
    }

    return { param };
  }

  render(context) {
    return '';
  }
}

module.exports = Macro;

