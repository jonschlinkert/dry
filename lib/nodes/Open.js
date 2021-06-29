'use strict';

const Node = require('./Node');

class Open extends Node {
  constructor(node) {
    super(node);
    this.type = 'open';
    this.trim_left = node.match[1].includes('-');
    this.trim_right = node.match[4].includes('-');
    this.blank = true;
  }

  parse() {
    if (!this.parsed) {
      this.parsed = true;
      this.name ||= this.match[2];
      this.markup = this.match[3].trim();
    }
    return this.markup;
  }

  render() {
    return '';
  }
}

module.exports = Open;
