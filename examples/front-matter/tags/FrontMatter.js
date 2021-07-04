'use strict';

const Dry = require('../../..');

class FrontMatter extends Dry.BlockTag {
  constructor(node, state) {
    super(node, state);
    this.type = 'front_matter';
  }

  parse() {
    const lines = this.nodes.slice(1, -1).map(n => n.value);
    const data = {};

    for (const line of lines) {
      if (line !== '\n') {
        const [key, value] = line.split(/:\s*/);
        data[key.trim()] = value.trim();
      }
    }

    return data;
  }

  render(context) {
    context.merge({ page: this.parse() });
    return '';
  }
}

module.exports = FrontMatter;
