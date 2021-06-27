'use strict';

const { assert_template_result } = require('../../test_helpers');

describe('content_tag_test', () => {
  it('test_content_variable', async () => {
    const assigns = { content: 'The content' };
    const fixture = `
      <!DOCTYPE html>
      <html lang="en">
        <body>
          {% content %}
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
    await assert_template_result(expected, fixture, assigns);
  });
});
