'use strict';

const Node = require('./Node');
const Condition = require('../Condition');
const Dry = require('../Dry');

class Branch extends Node {
  constructor(node, state) {
    super(node, state);
    this.name = node.name;
    this.markup = node.match[3];
    this.condition = new Condition(node);
    this.body = [];
  }

  push(node) {
    this.body.push(node);
  }

  evaluate(context) {
    if (this.expression instanceof Dry.VariableLookup) {
      return context.evaluate(this.expression);
    }
    return this.condition.evaluate(context);
  }

  async render_nodes(nodes = [], context, output = '') {
    context.resource_limits.increment_render_score(nodes.length);

    for (const node of nodes) {
      output += (await node.render(context)) || '';
      this.blank &&= node.blank;

      // If we get an Interrupt that means the block must stop processing. An
      // Interrupt is any command that stops block execution such as {% break %}
      // or {% continue %}. These tags may also occur through Block or Include tags.
      // if (context.interrupted()) break; // might have happened in a for-block
      context.resource_limits.increment_write_score(output);
    }

    return output;
  }

  async render(context) {
    return this.render_nodes(this.body, context);
  }

  get nodelist() {
    return this.body.map(node => node.value).filter(Boolean);
  }
}

module.exports = Branch;
