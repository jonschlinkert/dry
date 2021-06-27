'use strict';

const Dry = require('../Dry');
const { regex: { QuotedFragment: q, VariableSegment: v }, utils: { r, scan } } = Dry;

/**
 * Include allows templates to relate with other templates
 *
 * Simply include another template:
 *
 *   {% include 'product' %}
 *
 * Include a template with a local variable:
 *
 *   {% include 'product' with products[0] %}
 *
 * Include a template for a collection:
 *
 *   {% include 'product' for products %}
 */

class Include extends Dry.Tag {
  static Synax = r`(${q}+)(\\s+(?:with|for)\\s+(${q}+))?(\\s+(?:as)\\s+(${v}+))?`;

  constructor(node, state) {
    super(node, state);
    this.parse();
  }

  parse() {
    const markup = this.match[3];

    if (this.Syntax(markup, Include.Synax)) {
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
      this.raise_syntax_error('errors.syntax.include');
    }
  }

  render(context, output) {
    return this.render_to_output_buffer(context, output);
  }

  render_to_output_buffer(context) {
    if (this.disabled_tags.has('include')) {
      const err = new Dry.DisabledError(`include ${this.state.locale.t('errors.disabled.tag')}`);
      err.message = err.toString();
      throw err;
    }

    const template_name = context.evaluate(this.template_name_expr);
    if (!template_name) throw new Dry.ArgumentError(this.state.locale.t('errors.argument.include'));

    const partial = Dry.PartialCache.load(template_name, { context, state: this.state });
    if (!partial && context.strict_errors) {
      throw new Dry.FileSystemError(this.state.locale.t('errors.file_system.missing', { template_name }));
    }

    const last = arr => arr[arr.length - 1];
    const context_variable_name = this.alias_name || last(template_name.split('/'));

    const variable = this.variable_name_expr
      ? context.evaluate(this.variable_name_expr)
      : context.find_variable(template_name, { raise_on_not_found: false });

    const old_template_name = context.template_name;
    const old_partial       = context.partial;
    let output = '';

    try {
      context.template_name = template_name;
      context.partial       = true;
      context.stack({}, () => {
        for (const [key, value] of Object.entries(this.attributes)) {
          context.set(key, context.evaluate(value));
        }

        if (Array.isArray(variable)) {
          variable.forEach(val => {
            context.set(context_variable_name, val);
            output = partial.render_to_output_buffer(context, output);
          });
        } else {
          context.set(context_variable_name, variable);
          output = partial.render_to_output_buffer(context, output);
        }
      });
    } catch (err) {
      console.log(err);
    } finally {
      context.template_name = old_template_name;
      context.partial       = old_partial;
    }

    return output;
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

module.exports = Include;
