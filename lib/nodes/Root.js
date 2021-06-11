'use strict';

const BlockNode = require('./BlockNode');
const Dry = require('../Dry');

class Root extends BlockNode {
  constructor(node) {
    super(node);
    this.type = 'root';
    this.depth = 0;
  }

  resolve(value, context) {
    if (Array.isArray(value)) {
      return value.flat().map(v => this.resolve(v, context)).join('');
    }

    if (value && value?.to_liquid) {
      value = value.to_liquid();
    }

    const output = value && value?.to_s ? value.to_s() : value;
    return output == null ? '' : output;
  }

  render(context) {
    let output = '';

    for (let index = 0; index < this.nodes.length; index++) {
      output += this.resolve(this.nodes[index].render(context), context);
    }

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
