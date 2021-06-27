'use strict';

const Node = require('../nodes/Node');

class Elsif extends Node {
  constructor(node, state) {
    super(node, state);
    this.name = 'elsif';
    this.markup = node.match[3];
    this.trim_left = node.match[1].includes('-');
    this.trim_right = node.match[4].includes('-');
  }
}

module.exports = Elsif;
