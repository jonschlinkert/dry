'use strict';

const Node = require('../nodes/Node');

class Else extends Node {
  constructor(node) {
    super(node);
    this.name = 'else';
    this.markup = 'true';
    this.trim_left = node.match[1].includes('-');
    this.trim_right = node.match[3].includes('-');
  }

  render(context) {
    const branch = this.parent.branches.find(b => b.name === 'else');
    return branch.body.map(node => node.render(context)).join('');
  }
}

module.exports = Else;
