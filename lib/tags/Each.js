'use strict';

const Loop = require('../nodes/Loop');

class Each extends Loop {
  constructor(node) {
    super(node);
    this.name = 'each';
    this.pointer = 0;
  }

  render() {
    // const branch = this.branches[this.pointer];
    // const { condition, body } = branch;
  }
}

module.exports = Each;
