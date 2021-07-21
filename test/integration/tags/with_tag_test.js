'use strict';

const { assert_template_result } = require('../../test_helpers');
const { Template } = require('../../..');

describe('with_tag_test', () => {
  it.skip('test_unless', async () => {
    const tmpl = v => `{% with ${v} %}{{ name }}{% endwith %}`;
    console.log(await Template.render(tmpl('a')));
    console.log(await Template.render(tmpl('a'), { a: { name: 'doowb' } }));
    console.log(await Template.render(tmpl('a.b'), { a: { name: 'doowb' } }));
    console.log(await Template.render(tmpl('a.b'), { a: { b: { name: 'doowb' } } }));

    const template = `
      {% with %}
        {% assign foo = 42 %}
        {{ foo }} {% comment %}foo is 42 here{% endcomment %}
      {% endwith %}
    `;

  });
});
