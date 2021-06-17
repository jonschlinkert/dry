'use strict';

const { assert_template_result } = require('../../test_helpers');

describe('body_tag_test', () => {
  it('test_body_variable', () => {
    const assigns = { body: 'The content' };
    const fixture = `
      <!DOCTYPE html>
      <html lang="en">
        <body>
          {% body %}
        </body>
      </html>
    `;

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <body>
          The content
        </body>
      </html>
    `;
    assert_template_result(expected, fixture, assigns);
  });
});
