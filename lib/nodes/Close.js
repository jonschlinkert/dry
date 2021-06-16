'use strict';

const Node = require('./Node');

class Close extends Node {
  constructor(node) {
    super(node);
    this.type = 'close';
    this.trim_left = node.match[1].includes('-');
    this.trim_right = (node.match[4] || node.match[3]).includes('-');
  }

  parse() {}

  render() {
    // console.log(this);
    return '';
  }
}

module.exports = Close;
