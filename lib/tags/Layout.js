'use strict';

const Dry = require('../Dry');
const { regex: { QuotedFragment: q, VariableSegment: v }, utils: { r, scan } } = Dry;

// Layout allows templates to relate with other templates
//
// Simply layout another template:
//
//   {% layout 'product' %}
//
// Layout a template with a local variable:
//
//   {% layout 'product' with products[0] %}
//
// Layout a template for a collection:
//
//   {% layout 'product' for products %}
//
class Layout extends Dry.Tag {
  static LayoutSyntax = r`(${q}+)(\\s+(?:with|for)\\s+(${q}+))?(\\s+(?:as)\\s+(${v}+))?`;

  constructor(node, state) {
    super(node, state);
    this.parse();
  }

  parse() {
    const markup = this.match[3];

    if (this.Syntax(markup, this.LayoutSyntax)) {
      const template_name = this.last_match[1];
      const variable_name = this.last_match[3];

      this.alias_name         = this.last_match[5];
      this.variable_name_expr = variable_name ? this.parse_expression(variable_name) : null;
      this.template_name_expr = this.parse_expression(template_name);
      this.attributes         = {};

      scan(markup, Dry.regex.TagAttributes, (m, key, value) => {
        this.attributes[key] = this.parse_expression(value);
      });

    } else {
      this.raise_syntax_error('errors.syntax.layout');
    }
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  get children() {
    return [
      this.node.template_name_expr,
      this.node.variable_name_expr
    ].concat(Object.values(this.node.attributes));
  }
}
module.exports = Layout;
