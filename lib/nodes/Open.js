
const Node = require('./Node');

class Open extends Node {
  constructor(node) {
    super(node);
    this.type = 'open';
    this.name ||= this.match[2];
    this.markup = this.match[3].trim();
    this.trim_left = this.match[1].includes('-');
    this.trim_right = this.match[4].includes('-');
    this.blank = true;
  }

  render() {
    return '';
  }
}

module.exports = Open;
