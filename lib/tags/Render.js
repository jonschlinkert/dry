'use strict';

const Dry = require('../Dry');
const { regex, shared, utils } = Dry;
const { QuotedString: q, QuotedFragment: f, TagAttributes, VariableSegment: s } = regex;

class Render extends Dry.Tag {
  static Syntax = utils.r`(${q}+)(\\s+(with|for)\\s+(\\.|${f}+))?(\\s+(?:as)\\s+(${s}+))?`;

  constructor(node, state, parent) {
    super(node, state, parent);
    this.markup = this.match[3];

    if (this.ParseSyntax(this.markup, Render.Syntax)) {
      this.template_name      = this.last_match[1];
      this.variable_name      = this.last_match[4];
      const with_or_for       = this.last_match[3];

      this.alias_name         = this.last_match[6];
      this.variable_name_expr = this.variable_name ? this.parse_expression(this.variable_name) : null;
      this.template_name_expr = this.parse_expression(this.template_name);

      this.with               = with_or_for === 'with';
      this.for                = with_or_for === 'for';
      this.attributes         = {};

      utils.scan(this.markup, TagAttributes, (m, key, value) => {
        this.attributes[key] = this.parse_expression(value);
      });

    } else {
      this.raise_syntax_error('include');
    }
  }

  render(context, output) {
    return this.render_to_output_buffer(context, output);
  }

  render_to_output_buffer(context, output) {
    return this.render_tag(context, output);
  }

  async find_partial(context) {
    return shared.helpers.find_template('partials', this, context);
  }

  async render_tag(context) {
    this.disabled_tags.add('include');

    const { context_variable_name, partial, template_name } = await this.find_partial(context);
    let output = '';

    const render_partial_func = async (val, forloop) => {
      const inner_context = await context.new_isolated_subcontext();

      if (['embed', 'extends', 'from', 'import'].includes(this.parent?.name)) {
        inner_context.environments = context.environments.slice();
      }

      inner_context.set('blocks', await context.blocks);
      inner_context.set('template_name', template_name);
      inner_context.set('partial', true);

      if (forloop) inner_context.set('forloop', forloop);
      for (const [key, value] of Object.entries(this.attributes)) {
        inner_context.set(key, await context.evaluate(value));
      }

      if (this.with && utils.isPlainObject(val)) {
        inner_context.merge(val);
      }

      if (!utils.isNil(val)) {
        inner_context.set(context_variable_name, val);
      }

      output += (partial ? await partial.render_to_output_buffer(inner_context) : '');
      forloop?.increment();
    };

    const variable = this.variable_name_expr ? await context.evaluate(this.variable_name_expr) : null;

    if (this.for && (variable?.each || Array.isArray(variable))) {
      const forloop = new Dry.drops.ForLoopDrop(template_name, variable.length, null);

      if (Array.isArray(variable)) {
        for (const val of variable) {
          await render_partial_func(val, forloop);
        }
      } else {
        await variable.each(async val => await render_partial_func(val, forloop));
      }
    } else {
      await render_partial_func(variable, null);
    }

    this.disabled_tags.delete('include');
    return output;
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  get children() {
    return [this.node.template_name_expr].concat(Object.values(this.node.attributes));
  }
}

module.exports = Render;
