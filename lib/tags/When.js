'use strict';

const Dry = require('../Dry');

class When extends Dry.Node {
  constructor(node) {
    super(node);
    this.name = 'when';
    this.markup = this.match[3];
    this.body = [];

    if (this.markup === '') {
      throw new Dry.SyntaxError('Syntax error in {% when %}: missing arguments');
    }
  }

  evaluate(context) {
    return this.condition && this.condition.evaluate(context);
  }
}

module.exports = When;
