
const Dry = require('../Dry');

class Elsif extends Dry.Node {
  constructor(node, state, parent) {
    super(node, state, parent);
    this.name = 'elsif';
    this.markup = node.match[3];
    this.trim_left = node.match[1].includes('-');
    this.trim_right = node.match[4].includes('-');
  }
}

module.exports = Elsif;
