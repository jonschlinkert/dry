'use strict';

const Tag = require('../nodes/Tag');
const Dry = require('../Dry');

// Include allows templates to relate with other templates
//
// Simply include another template:
//
//   {% include 'product' %}
//
// Include a template with a local variable:
//
//   {% include 'product' with products[0] %}
//
// Include a template for a collection:
//
//   {% include 'product' for products %}
//
class Include extends Tag {
  // prepend Tag::Disableable

    IncludeSynax = Dry.utils.r`(${Dry.regex.QuotedFragment}+)(\\s+(?:with|for)\\s+(${Dry.regex.QuotedFragment}+))?(\\s+(?:as)\\s+(${Dry.regex.VariableSegment}+))?`
    // Syntax = IncludeSynax

    // attr_reader :template_name_expr, :variable_name_expr, :attributes

    constructor(node, state) {
      super(node, state);

      const markup = this.match[3];

      if (this.Syntax(markup, this.IncludeSynax)) {
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
        this.raise_syntax_error('errors.syntax.include');
      }
    }

    parse(_tokens) {
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

  // alias_method :parse_context, :options
  // private :parse_context

  // class ParseTreeVisitor < Liquid::ParseTreeVisitor
  //   children() {
  //     [
  //       this.node.template_name_expr,
  //       this.node.variable_name_expr,
  //     ] + this.node.attributes.values
  //   }
  // }
}

module.exports = Include;
