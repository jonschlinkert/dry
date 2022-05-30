'use strict';

const Node = require('./Node');

class Close extends Node {
  constructor(node, state, parent) {
    super(node, state);
    this.type = 'close';
    this.trim_left = node.match[1].includes('-');
    this.trim_right = (node.match[4] || node.match[3]).includes('-');
    this.blank = true;
  }

  render() {
    return '';
  }
}

module.exports = Close;
