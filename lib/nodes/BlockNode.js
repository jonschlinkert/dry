'use strict';

const { defineProperty } = Reflect;
const Node = require('./Node');
const Dry = require('../Dry');

class BlockNode extends Node {
  constructor(node, state) {
    super(node, state);
    this.nodes = [];
    this.blank = true;
  }

  push(node) {
    defineProperty(node, 'parent', { value: this });
    this.nodes.push(node);
  }

  unshift(node) {
    defineProperty(node, 'parent', { value: this });
    this.nodes.unshift(node);
  }

  remove(node) {
    this.nodes.splice(this.nodes.indexOf(node), 1);
  }

  replace(old_node, new_node) {
    if (new_node.parent) new_node.parent.remove(new_node);
    defineProperty(new_node, 'parent', { value: this });
    this.nodes[this.nodes.indexOf(old_node)] = new_node;
  }

  async render_nodes(nodes = [], context, output = '') {
    context.resource_limits.increment_render_score(nodes.length);

    for (const node of nodes) {
      output += await this.render_node(context, output, node);
      // If we get an Interrupt that means the block must stop processing. An
      // Interrupt is any command that stops block execution such as {% break %}
      // or {% continue %}. These tags may also occur through Block or Include tags.
      if (context.interrupted()) break; // might have happened in a for-block
      context.resource_limits.increment_write_score(output);
    }

    return output;
  }

  render_inner(context, output) {
    return this.nodes ? this.render_nodes(this.nodes, context, output) : '';
  }

  render_to_output_buffer(context, output) {
    return this.render_inner(context, output);
  }

  render(context, output) {
    return this.render_to_output_buffer(context, output);
  }

  render_node(context, output, node) {
    return this.constructor.render_node(context, output, node, this.state);
  }

  // @api private
  static async render_node(context, output, node, state) {
    try {
      return this.resolve(await node.render(context, output), context);
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
  static rescue_render_node(context, output, line_number, exc, blank_tag, state) {
    if (exc instanceof Dry.MemoryError || exc instanceof Dry.SyntaxError) throw exc;

    const errors = [Dry.UndefinedVariable, Dry.UndefinedDropMethod, Dry.UndefinedFilter];
    const error_message = context.handle_error(exc, line_number);

    if (!errors.some(E => exc instanceof E)) {
      if (!blank_tag) output += error_message;
      return output;
    }

    return '';
  }
}

module.exports = BlockNode;
