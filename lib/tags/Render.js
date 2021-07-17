'use strict';

const Dry = require('../Dry');
const { regex, utils } = Dry;
const { QuotedString: q, QuotedFragment: f, TagAttributes, VariableSegment: s } = regex;

class Render extends Dry.Tag {
  static Syntax = utils.r`(${q}+)(\\s+(with|for)\\s+(\\.|${f}+))?(\\s+(?:as)\\s+(${s}+))?`;

  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];

    if (this.ParseSyntax(this.markup, Render.Syntax)) {
      const template_name = this.last_match[1];
      const with_or_for   = this.last_match[3];
      const variable_name = this.last_match[4];

      this.alias_name         = this.last_match[6];
      this.variable_name_expr = variable_name ? this.parse_expression(variable_name) : null;
      this.template_name_expr = this.parse_expression(template_name);

      this.with = with_or_for === 'with';
      this.for = with_or_for === 'for';
      this.attributes = {};

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
    // Though we evaluate this here we will only ever parse it as a string literal.
    const template_name = await context.evaluate(this.template_name_expr);
    if (!template_name) throw new Dry.ArgumentError(this.state.locale.t('errors.argument.include'));

    const context_variable_name = this.alias_name || template_name.split('/').pop();
    let partial = Dry.PartialCache.load(template_name, { context, state: this.state });

    if (!partial) {
      partial = context.registers;
      const segs = template_name.split('/');

      while (segs.length) {
        partial = partial[segs.shift()];
      }

      if (partial && typeof partial === 'string') {
        partial = context.registers[template_name] = Dry.Template.parse(partial);
      }
    }

    if (!partial && context.strict_errors) {
      this.raise_file_system_error('missing', { template_name });
    }

    return { context_variable_name, partial, template_name };
  }

  async render_tag(context) {
    this.disabled_tags.add('include');

    const { context_variable_name, partial, template_name } = await this.find_partial(context);
    let output = '';

    const render_partial_func = async (val, forloop) => {
      const inner_context = await context.new_isolated_subcontext();
      inner_context.set('blocks', await context.blocks);
      inner_context.set('template_name', template_name);
      inner_context.set('partial', true);
      if (forloop) inner_context.set('forloop', forloop);

      for (const [key, value] of Object.entries(this.attributes)) {
        inner_context.set(key, await context.evaluate(value));
      }

      if (this.with && utils.isObject(val)) {
        inner_context.merge(val);
      }

      if (val != null) inner_context.set(context_variable_name, val);

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
