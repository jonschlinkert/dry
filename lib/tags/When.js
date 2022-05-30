'use strict';

const Dry = require('../Dry');

class When extends Dry.Tag {
  constructor(node, state, parent) {
    super(node, state);
    this.name = 'when';
    this.value = this.match[0];
    this.markup = this.match[3];
    this.body = [];

    if (this.markup === '') {
      this.raise_syntax_error('case_invalid_when');
    }
  }

  async evaluate(context) {
    return this.condition && (await this.condition.evaluate(context));
  }
}

module.exports = When;
