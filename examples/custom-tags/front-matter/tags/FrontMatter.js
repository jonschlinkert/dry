
const Dry = require('../../..');

class FrontMatter extends Dry.BlockTag {
  constructor(node, state) {
    super(node, state);
    this.type = this.name = 'front_matter';
  }

  parse() {
    const lines = this.nodes.slice(1, -1).map(n => n.value).join('\n').split('\n');
    const data = {};

    for (const line of lines) {
      if (line !== '' && line !== '\n') {
        const [key, ...value] = line.split(/: */);
        data[key.trim()] = value.join(': ').trim();
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
