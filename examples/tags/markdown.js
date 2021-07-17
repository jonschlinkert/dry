'use strict';

const Dry = require('../..');
const { Remarkable } = require('remarkable');

class Markdown extends Dry.Tag {
  render(context) {
    const value = context.evaluate(Dry.Expression.parse(this.match[3]));
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
    actual: await Dry.Template.render('foo {% markdown value %} bar', { value })
  });

})();
