'use strict';

const Tag = require('../nodes/Tag');
const Dry = require('../Dry');

// Extends allows templates to relate with other templates
//
//   {% extends 'product' %}
//
class Extends extends Tag {
  ExtendsSyntax = Dry.utils.r`(${Dry.regex.QuotedFragment}+)(?:\\s+(${Dry.regex.VariableSegment}+))?`;

  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];
    this.parse();
  }

  parse() {
    if (this.Syntax(this.markup, this.ExtendsSyntax)) {
      const template_name = this.last_match[1];
      const variable_name = this.last_match[3];

      this.alias_name         = this.last_match[5];
      this.variable_name_expr = variable_name ? Dry.Expression.parse(variable_name) : null;
      this.template_name_expr = Dry.Expression.parse(template_name);
      this.attributes         = {};

      Dry.utils.scan(this.markup, Dry.regex.TagAttributes, (m, key, value) => {
        this.attributes[key] = Dry.Expression.parse(value);
      });

    } else {
      this.raise_syntax_error('errors.syntax.template');
    }
  }

  render(context, output) {
    return this.render_to_output_buffer(context, output);
  }

  render_to_output_buffer(context) {
    if (this.disabled_tags.has('extends')) {
      const err = new Dry.DisabledError(`extends ${this.state.locale.t('errors.disabled.tag')}`);
      err.message = err.toString();
      throw err;
    }

    const template_name = context.evaluate(this.template_name_expr);
    if (!template_name) throw new Dry.ArgumentError(this.state.locale.t('errors.argument.extends'));

    const collection = Dry.Template.collections.get('templates');
    const template = collection && collection.get(template_name);
    const template_blocks = template && Dry.Template.blocks.get(template.state.path);
    const self_blocks = Dry.Template.blocks.get(this.state.path);
    const cache = new Map();

    if (!template_blocks) {
      return '';
    }

    for (const [key, block] of template_blocks) {
      const substitute = self_blocks.get(key);

      if (substitute) {
        cache.set(key, block);
        template_blocks.set(key, substitute);
      }
    }

    // console.log(self_blocks === template_blocks);
    // console.log(template.state.path);

    const output = template.render(context);

    for (const [key, block] of cache) {
      template_blocks.set(key, block);
    }

    return output;

    // const last = arr => arr[arr.length - 1];
    // const context_variable_name = this.alias_name || last(template_name.split('/'));

    // const variable = this.variable_name_expr
    //   ? context.evaluate(this.variable_name_expr)
    //   : context.find_variable(template_name, { raise_on_not_found: false });

    // console.log(Dry.Template.blocks);

    // const old_template_name = context.template_name;
    // const old_layout        = context.template;
    // let output = '';

    // try {
    //   context.template_name = template_name;
    //   context.template       = true;
    //   context.stack({}, () => {
    //     for (const [key, value] of Object.entries(this.attributes)) {
    //       context.set(key, context.evaluate(value));
    //     }

    //     if (Array.isArray(variable)) {
    //       variable.forEach(val => {
    //         context.set(context_variable_name, val);
    //         output = template.render_to_output_buffer(context, output);
    //       });
    //     } else {
    //       context.set(context_variable_name, variable);
    //       output = template.render_to_output_buffer(context, output);
    //     }
    //   });
    // } catch (err) {
    //   console.log(err);
    // } finally {
    //   context.template_name = old_template_name;
    //   context.template       = old_layout;
    // }

    // return output;
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

module.exports = Extends;
