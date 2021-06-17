'use strict';

const Tag = require('../nodes/Tag');
const Dry = require('../Dry');

class Render extends Tag {
    RenderSyntax = Dry.utils.r`(${Dry.regex.QuotedString}+)(\\s+(with|for)\\s+(${Dry.regex.QuotedFragment}+))?(\\s+(?:as)\\s+(${Dry.regex.VariableSegment}+))?`;

    // disable_tags "include"
    // attr_reader :template_name_expr, :attributes

    constructor(node, state) {
      super(node, state);

      const markup = this.match[3];

      if (this.Syntax(markup, this.RenderSyntax)) {
        const template_name = this.last_match[1];
        const with_or_for = this.last_match[3];
        const variable_name = this.last_match[4];

        this.alias_name = this.last_match[6];
        this.variable_name_expr = variable_name ? Dry.Expression.parse(variable_name) : null;
        this.template_name_expr = Dry.Expression.parse(template_name);
        this.for = (with_or_for === 'for');

        this.attributes = {};

        Dry.utils.scan(markup, Dry.regex.TagAttributes, (m, key, value) => {
          this.attributes[key] = Dry.Expression.parse(value);
        });

      } else {
        this.raise_syntax_error('errors.syntax.include');
      }
    }

    render(context, output) {
      return this.render_to_output_buffer(context, output);
    }

    render_to_output_buffer(context, output) {
      return this.render_tag(context, output);
    }

    render_tag(context) {
      this.disabled_tags.add('include');

      // Though we evaluate this here we will only ever parse it as a string literal.
      const template_name = context.evaluate(this.template_name_expr);
      if (!template_name) throw new Dry.ArgumentError(this.state.locale.t('errors.argument.include'));

      const partial = Dry.PartialCache.load(template_name, { context, state: this.state });

      const last = arr => arr[arr.length - 1];
      const context_variable_name = this.alias_name || last(template_name.split('/'));
      let output = '';

      const render_partial_func = (val, forloop) => {
        const inner_context                   = context.new_isolated_subcontext();
        inner_context.template_name           = template_name;
        inner_context.partial                 = true;
        if (forloop) inner_context['forloop'] = forloop;

        for (const [key, value] of Object.entries(this.attributes)) {
          inner_context.set(key, context.evaluate(value));
        }

        if (val != null) inner_context.set(context_variable_name, val);
        output += partial.render_to_output_buffer(inner_context);
        forloop?.increment();
      };

      const variable = this.variable_name_expr ? context.evaluate(this.variable_name_expr) : null;

      if (this.for && (variable?.each || Array.isArray(variable))) {
        const forloop = new Dry.drops.ForLoopDrop(template_name, variable.length, null);
        if (Array.isArray(variable)) {
          variable.forEach(val => render_partial_func(val, forloop));
        } else {
          variable.each(val => render_partial_func(val, forloop));
        }
      } else {
        render_partial_func(variable, null);
      }

      this.disabled_tags.delete('include');
      return output;
    }

  // class ParseTreeVisitor < Dry.ParseTreeVisitor
  //   children() {
  //     [
  //       this.node.template_name_expr,
  //     ] + this.node.attributes.values
  //   }
  // }
}

module.exports = Render;
