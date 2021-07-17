'use strict';

const { Template } = require('../../..');
const { assert_template_result, StubFileSystem } = require('../../test_helpers');

describe.skip('body_tag_test', () => {
  it('test_body_variable', async () => {
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
      {% layout "default" %}
      The content
    `;

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <body>
          The content
        </body>
      </html>
    `;

    Template.layouts = new StubFileSystem(layouts);
    console.log(await Template.parse(fixture, { line_numbers: true }).render_strict(assigns, { layouts }));
    // assert_template_result(expected, fixture, assigns);
  });
});
