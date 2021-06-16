'use strict';

const Node = require('../nodes/Node');
const Dry = require('../Dry');

class When extends Node {
  constructor(node) {
    super(node);
    this.name = 'when';
    this.markup = this.match[3];
    this.body = [];

    if (this.markup === '') {
      throw new Dry.SyntaxError('Syntax error in {% when %}: missing arguments');
    }
  }

  push(node) {
    this.body.push(node);
    node.parent = this;
  }

  evaluate(context) {
    return this.condition && this.condition.evaluate(context);
  }

  render(context) {
    return this.body.map(node => node.render(context)).join('');
  }
}

module.exports = When;
