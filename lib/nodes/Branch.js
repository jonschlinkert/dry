'use strict';

const Dry = require('../Dry');

const toString = s => {
  if (s !== null && typeof s === 'object') {
    return '';
  }

  return String(s);
};

class Branch extends Dry.Node {
  constructor(node, state) {
    super(node, state);
    this.name = node.name;
    this.markup = node.match[3];
    this.condition = new Dry.Condition(node);
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
      output += toString(await node.render(context));
      this.blank &&= node.blank;

      // If we get an Interrupt that means the block must stop processing. An
      // Interrupt is any command that stops block execution such as {% break %}
      // or {% continue %}. These tags may also occur through Block or Include tags.
      if (context.interrupted()) break; // might have happened in a for-block

      try {
        context.resource_limits.increment_write_score(output);
      } catch (error) {
        return context.handle_error(error);
      }
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
