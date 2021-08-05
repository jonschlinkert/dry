'use strict';

const Dry = require('../../Dry');

const toString = s => {
  try {
    return s == null ? '' : (s.toString ? s.toString() : s);
  } catch {
    return '';
  }
};

exports.render = (node, context, output) => {
  return exports.render_to_output_buffer(node, context, output);
};

exports.render_to_output_buffer = (node, context, output) => {
  return exports.render_inner(node, context, output);
};

exports.render_inner = (node, context, output) => {
  return node.nodes ? exports.render_nodes(node, node.nodes, context, output) : '';
};

exports.render_node = async (node, context, output, state) => {
  try {
    return exports.resolve(node, await node.render(context, output), context);
  } catch (e) {
    const blank_tag = !(node instanceof Dry.Variable) && node.blank;
    return exports.rescue_render_node(node, context, output, e, blank_tag, state);
  }
};

exports.render_nodes = async (node, nodes = [], context, output = '') => {
  try {
    context.resource_limits.increment_render_score(nodes.length);
  } catch (err) {
    return context.handle_error(err);
  }

  for (const child of nodes) {
    output += toString(await exports.render_node(child, context, output));
    node.blank &&= child.blank;

    // If we get an Interrupt that means the block must stop processing. An
    // Interrupt is any command that stops block execution such as {% break %}
    // or {% continue %}. These tags may also occur through Block or Include tags.
    if (context.interrupted()) break; // might have happened in a for-block

    try {
      context.resource_limits.increment_write_score(output);
    } catch (err) {
      return context.handle_error(err);
    }
  }

  return output;
};

exports.rescue_render_node = (node, context, output, exc, blank_tag, state) => {
  if (exc instanceof Dry.MemoryError || exc instanceof Dry.SyntaxError) throw exc;

  const errors = [Dry.UndefinedVariable, Dry.UndefinedDropMethod, Dry.UndefinedFilter];
  const error_message = context.handle_error(exc, node.line_number);

  if (!errors.some(E => exc instanceof E)) {
    if (!blank_tag) output += error_message;
    return output;
  }

  return '';
};

exports.resolve = (node, value, context) => {
  if (Array.isArray(value)) {
    return value.flat().map(v => exports.resolve(node, v, context)).join('');
  }

  if (value && typeof value?.to_liquid === 'function') {
    value = value.to_liquid();
  }

  const output = value && typeof value?.to_s === 'function' ? value.to_s() : value;
  return output == null ? '' : output;
};
