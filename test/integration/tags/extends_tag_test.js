
const { State, Template, FileSystem } = require('../../..');
const { assert_template_result, StubFileSystem } = require('../../test_helpers');

const block = (name, text) => `{% block '${name}' %}${text}{% endblock %}`;
const ext = (extname, name, text) => `{% extends '${extname}' %}\n${block(name, text)}`;
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
  beforeEach(() => {
    Template.file_system = new FileSystem.BlankFileSystem();
    State.blocks = {};
  });

  it('test_extends_and_blocks', async () => {
    const assigns = {};
    const layouts = { default: html(block('body', 'Default content')) };
    const fixture = ext('default', 'body', 'The body content');
    const expected = html('The body content');

    Template.file_system = new StubFileSystem(layouts);
    await assert_template_result(expected, fixture, assigns);
  });

  it('test_multiple_blocks', async () => {
    const assigns = {};
    const layouts = {
      default: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          {% block 'head' %}{% endblock %}
        </head>
        <body>
          {% block 'body' %}Default Content{% endblock %}
          {% block 'footer' %}{% endblock %}
        </body>
      </html>`
    };

    const fixture = `{% extends "default" %}
      {% block 'head' %}<title>The title</title>{% endblock %}
      {% block 'body' %}The body content{% endblock %}
      {% block 'footer' %}The footer{% endblock %}
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
      </html>`;

    Template.file_system = new StubFileSystem(layouts);

    return assert_template_result(expected, fixture, assigns);
  });

  it('test_override_variable_block_names_with_literal_block_names', async () => {
    const assigns = { head: 'a', body: 'b', footer: 'c', main: 'd' };
    const layouts = {
      default: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          {% block head %}<title>Default title</title>{% endblock %}
        </head>
        <body>
          {% block main %}Default main{% endblock %}
          {% block body %}Default body{% endblock %}
          {% block footer %}Default footer{% endblock %}
        </body>
      </html>`
    };

    const fixture = `{% extends "default" %}
      {% block 'foo' %}{% endblock %}
      {% block 'bar' %}{% endblock %}
      {% block 'baz' %}{% endblock %}
      {% block 'c' %}New footer{% endblock %}
      {% block 'b' %}New body{% endblock %}
      {% block 'a' %}<title>New title</title>{% endblock %}
      {% block 'd' %}New main{% endblock %}
    `;

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>New title</title>
        </head>
        <body>
          New main
          New body
          New footer
        </body>
      </html>`;

    Template.file_system = new StubFileSystem(layouts);

    return assert_template_result(expected, fixture, assigns);
  });

  it('test_override_variable_block_names_with_variable_block_names', async () => {
    const assigns = { head: 'A', body: 'b', footer: 'c', main: 'd', one: 'a', two: 'b', three: 'c', four: 'd' };
    const layouts = {
      default: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          {% block head %}<title>Default title</title>{% endblock %}
        </head>
        <body>
          {% block main %}Default main{% endblock %}
          {% block body %}Default body{% endblock %}
          {% block footer %}Default footer{% endblock %}
        </body>
      </html>`
    };

    const fixture = `{% extends "default" %}
      {% block three %}New footer{% endblock %}
      {% block two %}New body{% endblock %}
      {% block one | upcase %}<title>New title</title>{% endblock %}
      {% block four %}New main{% endblock %}
    `;

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>New title</title>
        </head>
        <body>
          New main
          New body
          New footer
        </body>
      </html>`;

    Template.file_system = new StubFileSystem(layouts);

    return assert_template_result(expected, fixture, assigns);
  });

  it('test_multiple_blocks_with_modes', async () => {
    const assigns = {};
    const layouts = {
      default: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>{% block 'head' %}Default Head{% endblock %}</title>
        </head>
        <body>
          {% block 'body' %}Default Content{% endblock %}
          {% block 'footer' %}Default footer{% endblock %}
        </body>
      </html>`
    };

    const fixture = `{% extends "default" %}
      {% block 'head' mode="append" %} | The title{% endblock %}
      {% block 'body' mode="prepend" %}The body content | {% endblock %}
      {% block 'footer' mode="replace" %}The footer{% endblock %}
    `;

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Default Head | The title</title>
        </head>
        <body>
          The body content | Default Content
          The footer
        </body>
      </html>`;

    Template.file_system = new StubFileSystem(layouts);
    return assert_template_result(expected, fixture, assigns);
  });

  it('test_multiple_blocks_with_variable_modes', async () => {
    const assigns = { mode_a: 'prepend', mode_b: 'append' };
    const layouts = {
      default: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>{% block 'head' %}Default Head{% endblock %}</title>
        </head>
        <body>
          {% block 'body' %}Default Content{% endblock %}
          {% block 'footer' %}Default footer{% endblock %}
        </body>
      </html>`
    };

    const fixture = `{% extends "default" %}
      {% block 'head' mode=mode_b %} | The title{% endblock %}
      {% block 'body' mode=mode_a %}The body content | {% endblock %}
      {% block 'footer' mode="replace" %}The footer{% endblock %}
    `;

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Default Head | The title</title>
        </head>
        <body>
          The body content | Default Content
          The footer
        </body>
      </html>`;

    Template.file_system = new StubFileSystem(layouts);
    return assert_template_result(expected, fixture, assigns);
  });

  it('test_variable_block_names_and_variable_modes', async () => {
    const assigns = {
      head: 'A',
      body: 'b',
      footer: 'c',
      main: 'd',
      one: 'a',
      two: 'b',
      three: 'c',
      four: 'd',

      alpha: 'prepend',
      beta: 'append'
    };

    const layouts = {
      default: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          {% block head %}<title>Default title</title>{% endblock %}
        </head>
        <body>
          {% block main %}Default main{% endblock %}
          {% block body %}Default body{% endblock %}
          {% block footer %}Default footer{% endblock %}
        </body>
      </html>`
    };

    const fixture = `{% extends "default" %}
      {% block three mode=alpha %}New footer{% endblock %}
      {% block two mode=beta %}New body{% endblock %}
      {% block one mode=alpha | upcase %}<title>New title</title>{% endblock %}
      {% block four mode=beta %}New main{% endblock %}
    `;

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>New title</title><title>Default title</title>
        </head>
        <body>
          Default mainNew main
          Default bodyNew body
          New footerDefault footer
        </body>
      </html>`;

    Template.file_system = new StubFileSystem(layouts);

    return assert_template_result(expected, fixture, assigns);
  });

  it('test_supports_nested_extends', () => {
    const assigns = {};
    const layouts = { default: html(block('body', 'Default content')) };
    const fixture = ext('default', 'body', 'The body content');
    const expected = html('The body content');

    Template.file_system = new StubFileSystem(layouts);
    return assert_template_result(expected, fixture, assigns);
  });

  it('test_supports_root_context_in_nested_extends', async () => {
    const layouts = {
      'base.html': `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <link rel="stylesheet" href="style.css">
          <title>{% block 'title' %}My amazing site{% endblock %}</title>
        </head>
        <body>
          <div id="sidebar">
            {% block 'sidebar' -%}
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/blog/">Blog</a></li>
            </ul>
            {% endblock %}
          </div>
          <div id="content">
            {%- block 'content' -%}{%- endblock -%}
          </div>
        </body>
      </html>
      `
    };

    const source = `
        {% extends "base.html" %}
        {% block 'title' %}My amazing blog{% endblock %}
        {%- block 'content' -%}
          {% if blog_entries.length >= 2 %}
            <ul>
            {%- for entry in blog_entries %}
              <li>
                <h2>{{ entry.title }}</h2>
                <p>{{ entry.body }}</p>
              </li>
            {% endfor -%}
            </ul>
          {% endif -%}
        {% endblock %}
    `;

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <link rel="stylesheet" href="style.css">
          <title>My amazing blog</title>
        </head>
        <body>
          <div id="sidebar">
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/blog/">Blog</a></li>
            </ul>
${'            '}
          </div>
          <div id="content">
            <ul>
              <li>
                <h2>Entry one</h2>
                <p>This is my first entry.</p>
              </li>
${'            '}
              <li>
                <h2>Entry two</h2>
                <p>This is my second entry.</p>
              </li>
            </ul>
          </div>
        </body>
      </html>
      `;

    const assigns = {
      blog_entries: [
        { title: 'Entry one', body: 'This is my first entry.' },
        { title: 'Entry two', body: 'This is my second entry.' }
      ]
    };

    Template.file_system = new StubFileSystem(layouts);
    return assert_template_result(expected.trim(), source, assigns, s => s.trim());
  });
});
