'use strict';

const { Template } = require('../../..');
const { assert_template_result, StubFileSystem } = require('../../test_helpers');

const block = (name, text) => `{% block ${name} %}${text}{% endblock %}`;
const ext = (extname, name, text) => `{% extends "${extname}" %}\n${block(name, text)}`;
const html = (content, ext = '') => {
  return `
<!DOCTYPE html>
<html lang="en">
  <body>
    ${content}
  </body>
</html>
`;
};

describe('extends_tag_test', () => {
  it('test_extends_and_blocks', async () => {
    const assigns = {};
    const layouts = { default: html(block('body', 'Default content')) };
    const fixture = ext('default', 'body', 'The body content');
    const expected = html('The body content');

    Template.file_system = new StubFileSystem(layouts);
    await assert_template_result(expected, fixture, assigns);
  });

  it.skip('test_multiple_blocks', async () => {
    const assigns = {};
    const layouts = {
      default: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          {% block head %}{% endblock %}
        </head>

      </html>`,
      head: ``,
      body: `
        <body>
          {% block body %}Default Content{% endblock %}
          {% block footer %}{% endblock %}
        </body>`
    };

    const fixture = `{% extends "default" %}
      {% block head %}<title>The title</title>{% endblock %}
      {% block body %}The body content{% endblock %}
      {% block footer %}The footer{% endblock %}
    `;

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>The title</title>
        </head>
        <body>
          The body content
          The footer
        </body>
      </html>
    `;

    Template.file_system = new StubFileSystem(layouts);
    await assert_template_result(expected, fixture, assigns);
  });

  it('test_supports_nested_extends', async () => {
    const assigns = {};
    const layouts = { default: html(block('body', 'Default content')) };
    const fixture = ext('default', 'body', 'The body content');
    const expected = html('The body content');

    Template.file_system = new StubFileSystem(layouts);
    await assert_template_result(expected, fixture, assigns);
  });
});
