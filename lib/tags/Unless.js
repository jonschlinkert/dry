'use strict';

const If = require('./If');

class Unless extends If {
  evaluate_branch(branch, context) {
    return !super.evaluate_branch(branch, context);
  }
}

module.exports = Unless;
