'use strict';

const Node = require('./Node');

class Close extends Node {
  constructor(node, state) {
    super(node, state);
    this.type = 'close';
    this.trim_left = node.match[1].includes('-');
    this.trim_right = (node.match[4] || node.match[3]).includes('-');
  }

  render() {
    return '';
  }
}

module.exports = Close;
