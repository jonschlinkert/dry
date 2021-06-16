'use strict';

const BlockTag = require('./BlockTag');
const Dry = require('../Dry');

class Root extends BlockTag {
  constructor(node, state) {
    super(node, state);
    this.type = 'root';
    this.depth = 0;
  }

  get nodelist() {
    return this.nodes;
  }

  render(context, output) {
    return this.render_to_output_buffer(context, output);
  }

  render_to_output_buffer(context, output = '') {
    context.resource_limits.increment_render_score(this.nodes.length);

    for (const node of this.nodes) {
      output += this.render_node(context, output, node);
      // If we get an Interrupt that means the block must stop processing. An
      // Interrupt is any command that stops block execution such as {% break %}
      // or {% continue %}. These tags may also occur through Block or Include tags.
      if (context.interrupted()) break; // might have happened in a for-block
      context.resource_limits.increment_write_score(output);
    }

    return output;
  }

  render_node(context, output, node) {
    return Root.render_node(context, output, node, this.state);
  }

  // @api private
  static render_node(context, output, node, state) {
    try {
      return this.resolve(node.render(context, output), context);
    } catch (e) {
      const blank_tag = !(node instanceof Dry.Variable) && node.blank;
      return this.rescue_render_node(context, output, node.line_number, e, blank_tag, state);
    }
  }

  static resolve(value, context) {
    if (Array.isArray(value)) {
      return value.flat().map(v => this.resolve(v, context)).join('');
    }

    if (value && value?.to_liquid) {
      value = value.to_liquid();
    }

    const output = value && value?.to_s ? value.to_s() : value;
    return output == null ? '' : output;
  }

  // @api private
  static rescue_render_node(context, output, line_number, e, blank_tag, state) {
    if (e instanceof Dry.MemoryError) throw e;

    const errors = [Dry.UndefinedVariable, Dry.UndefinedDropMethod, Dry.UndefinedFilter, Dry.SyntaxError];

    if (context.strict_variables || e instanceof Dry.SyntaxError) {
      throw e;
    }

    if (errors.some(E => e instanceof E)) {
      return context.handle_error(e, line_number);
    }

    const error_message = context.handle_error(e, line_number);
    if (!blank_tag) output += error_message;
    return output;
  }

  static get ParseTreeVisitor() {
    return class extends Dry.ParseTreeVisitor {
      Parent = Root;
      get children() {
        return this.node.nodes.slice();
      }
    };
  }
}

module.exports = Root;
