'use strict';

const { Template } = require('../../..');
const { assert_template_result, StubFileSystem } = require('../../test_helpers');

describe.skip('extends_tag_test', () => {
  it('test_extends_variable', async () => {
    const assigns = {};
    const layouts = {
      default: `
      <!DOCTYPE html>
      <html lang="en">
        <body>
          {% body %}
        </body>
      </html>
    `
    };

    const fixture = `
      {% extends "default" %}
      {% block body %}
        The body content
      {% endblock %}
    `;

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <body>
          The body content
        </body>
      </html>
    `;

    Template.layouts = new StubFileSystem(layouts);
    console.log(Template.parse(fixture, { line_numbers: true }).render_strict(assigns, { layouts }));
    // assert_template_result(expected, fixture, assigns);
  });
});
