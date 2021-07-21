'use strict';

const Dry = require('../Dry');

class Else extends Dry.Node {
  constructor(node, state) {
    super(node, state);
    this.name = 'else';
    this.markup = 'true';
    this.trim_left = node.match[1].includes('-');
    this.trim_right = node.match[3].includes('-');
  }

  async render(context) {
    const branch = this.parent.branches.find(b => b.name === 'else');
    const output = await Promise.all(branch.body.map(node => node.render(context)));
    return output.join('');
  }
}

module.exports = Else;
