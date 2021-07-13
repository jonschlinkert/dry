'use strict';

const If = require('./If');

class Unless extends If {
  async evaluate_branch(branch, context) {
    return !(await super.evaluate_branch(branch, context));
  }
}

module.exports = Unless;
