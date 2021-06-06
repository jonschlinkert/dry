'use strict';

const Loop = require('../nodes/Loop');

class While extends Loop {
  constructor(node) {
    super(node);
    this.name = 'while';
    this.pointer = 0;
  }

  render() {
    // const branch = this.branches[this.pointer];
    // const { condition, body } = branch;
  }
}

module.exports = While;
