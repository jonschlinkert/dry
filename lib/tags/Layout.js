'use strict';

const Tag = require('../nodes/Tag');
const Dry = require('../Dry');

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
class Layout extends Tag {
  LayoutSyntax = Dry.utils.r`(${Dry.regex.QuotedFragment}+)(\\s+(?:with|for)\\s+(${Dry.regex.QuotedFragment}+))?(\\s+(?:as)\\s+(${Dry.regex.VariableSegment}+))?`

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
      this.variable_name_expr = variable_name ? Dry.Expression.parse(variable_name) : null;
      this.template_name_expr = Dry.Expression.parse(template_name);
      this.attributes         = {};

      Dry.utils.scan(markup, Dry.regex.TagAttributes, (m, key, value) => {
        this.attributes[key] = Dry.Expression.parse(value);
      });

    } else {
      this.raise_syntax_error('errors.syntax.layout');
    }
  }

  render(context, output) {
    return this.render_to_output_buffer(context, output);
  }

  render_to_output_buffer(context) {
    if (this.disabled_tags.has('layout')) {
      const err = new Dry.DisabledError(`layout ${this.state.locale.t('errors.disabled.tag')}`);
      err.message = err.toString();
      throw err;
    }

    const template_name = context.evaluate(this.template_name_expr);
    if (!template_name) throw new Dry.ArgumentError(this.state.locale.t('errors.argument.layout'));

    const layout = Dry.LayoutCache.load(template_name, { context, state: this.state });
    // console.log(layout);

    const last = arr => arr[arr.length - 1];
    const context_variable_name = this.alias_name || last(template_name.split('/'));

    const variable = this.variable_name_expr
      ? context.evaluate(this.variable_name_expr)
      : context.find_variable(template_name, { raise_on_not_found: false });

    const old_template_name = context.template_name;
    const old_layout        = context.layout;
    let output = '';

    try {
      context.template_name = template_name;
      context.layout       = true;
      context.stack({}, () => {
        for (const [key, value] of Object.entries(this.attributes)) {
          context.set(key, context.evaluate(value));
        }

        if (Array.isArray(variable)) {
          variable.forEach(val => {
            context.set(context_variable_name, val);
            output = layout.render_to_output_buffer(context, output);
          });
        } else {
          context.set(context_variable_name, variable);
          output = layout.render_to_output_buffer(context, output);
        }
      });
    } catch (err) {
      console.log(err);
    } finally {
      context.template_name = old_template_name;
      context.layout = old_layout;
    }

    return output;
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  get children() {
    return [this.node.template_name_expr, this.node.variable_name_expr].concat(this.node.attributes.values);
  }
}

module.exports = Layout;
