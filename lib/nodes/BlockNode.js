'use strict';

const { defineProperty } = Reflect;
const render = require('../shared/helpers/render');
const Dry = require('../Dry');

const kNodelist = Symbol(':nodelist');

class BlockNode extends Dry.Node {
  constructor(node, state, parent) {
    super(node, state, parent);
    this.nodes = [];
    this.blank = true;
  }

  push(node) {
    defineProperty(node, 'parent', { value: this });
    this.nodes.push(node);
  }

  async render_nodes(nodes = [], context, output = '') {
    return render.render_nodes(this, this.nodes, context, output);
  }

  render_node(context, output, node) {
    return this.constructor.render_node(context, output, node, this.state);
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

  // Remove blank strings in the block body for a control flow tag (e.g. `if`, `for`, `case`, `unless`)
  // with a blank body.
  //
  // For example, in a conditional assignment like the following
  //
  // ```
  // {% if size > max_size %}
  //   {% assign size = max_size %}
  // {% endif %}
  // ```
  //
  // we assume the intention wasn't to output the blank spaces in the `if` tag's block body, so this method
  // will remove them to reduce the render output size.
  //
  // Note that it is now preferred to use the `liquid` tag for this use case.
  remove_blank_strings() {
    if (!this.blank) {
      throw new Dry.Error('remove_blank_strings only support being called on a blank block body');
    }

    this.nodelist = this.nodelist.filter(node => typeof node === 'string');
  }

  set nodelist(value) {
    this[kNodelist] = value;
  }
  get nodelist() {
    return this[kNodelist];
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
