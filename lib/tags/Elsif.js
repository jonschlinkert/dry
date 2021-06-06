'use strict';

const Node = require('../nodes/Node');

class Elsif extends Node {
  constructor(node) {
    super(node);
    this.name = 'elsif';
    this.value = node.match[3];
    this.trim_left = node.match[1].includes('-');
    this.trim_right = node.match[4].includes('-');
  }
}

module.exports = Elsif;
