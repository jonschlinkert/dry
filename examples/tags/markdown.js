
const Dry = require('../..');
const { Remarkable } = require('remarkable');

class Markdown extends Dry.Tag {
  async render(context) {
    const node = Dry.Expression.parse(this.match[3]);
    const value = await context.evaluate(node);
    const md = new Remarkable();
    return md.render(value);
  }
}

Dry.Template.register_tag('markdown', Markdown);

(async () => {
  const value = `
# Heading

> This is markdown!

Let's see if this works.
`;

  console.log({
    expected: '<doowb>',
    actual: await Dry.Template.render_strict('foo {% markdown value %} bar', { value })
  });

})();
