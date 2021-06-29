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

  async render(context) {
    return Promise.all(this.body.map(node => node.render(context))).then(v => v.join(''));
  }

  get nodelist() {
    return this.body.map(node => node.value).filter(Boolean);
  }
}

module.exports = Branch;
