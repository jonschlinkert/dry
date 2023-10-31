'use strict';

const assert = require('assert').strict;
const { assert_template_result, StubFileSystem } = require('../../test_helpers');
const { Template } = require('../../..');

describe('layout_tag_test', () => {
  it('test_content_variable', async () => {
    const fixture = `
      {%- layout "default" -%}
          The content`;

    Template.layouts = new StubFileSystem({
      default: `
      <!DOCTYPE html>
      <html lang="en">
        <body>
          {% content %}
        </body>
      </html>
    `
    });

    const expected = `
      <!DOCTYPE html>
      <html lang="en">
        <body>
          The content
        </body>
      </html>
    `;

    const template = Template.parse(fixture);
    const actual = await template.render_strict();
    assert.equal(actual, expected);
  });

  it('test_literal_layout_name', async () => {
    const fixture = '{% layout "bar" %}This is content';

    Template.layouts = new StubFileSystem({
      base: 'foo {% content %} foo',
      bar: 'bar {% content %} bar',
      baz: 'baz {% content %} baz'
    });

    const expected = 'bar This is content bar';
    const template = Template.parse(fixture);
    const actual = await template.render_strict();
    assert.equal(actual, expected);
  });

  it('test_variable_layout_name', async () => {
    const fixture = '{% layout name %}This is content';

    Template.layouts = new StubFileSystem({
      base: 'before {% content %} after'
    });

    const expected = 'before This is content after';
    const template = Template.parse(fixture);
    const actual = await template.render_strict({ name: 'base' });
    assert.equal(actual, expected);
  });

  it('test_layout_with_extends_with_multiple_blocks_with_modes', async () => {
    const templates = {
      default: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>{% block "head" %}Default Head{% endblock %}</title>
        </head>
        <body>
          {%- block "content" -%}{%- endblock %}
          {% block "body" %}Default Content{% endblock %}
          {% block "footer" %}Default footer{% endblock %}
        </body>
      </html>`
    };

    const fixture = `{%- layout name -%} {% extends "default" %}
      {% block "head" mode="append" %} | The title{% endblock %}
      {% block "body" mode="prepend" %}The body content | {% endblock %}
      {% block "footer" mode="replace" %}The footer{% endblock %}
      This content should not be rendered.
    `;

    const expected = `before .
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Default Head | The title</title>
        </head>
        <body>
          The body content | Default Content
          The footer
        </body>
      </html>. after`;

    Template.layouts = new StubFileSystem({
      base: 'before .{% content %}. after'
    });

    Template.file_system = new StubFileSystem(templates);

    const template = Template.parse(fixture, { line_numbers: true });
    const opts = { strict_filters: true, strict_variables: false };
    const actual = await template.render({ name: 'base' }, opts)
    return assert_template_result(expected, fixture, { name: 'base' });
  });

  it('test_nested_layouts', async () => {
    const fixture = '{%- layout "a" -%} This is content';

    Template.layouts = new StubFileSystem({
      a: '{%- layout "b" -%} A {% content %} A',
      b: '{%- layout "c" -%} B {% content %} B',
      c: '{%- layout "d" -%} C {% content %} C',
      d: '{%- layout "e" -%} D {% content %} D',
      e: '{%- layout "f" -%} E {% content %} E',
      f: '{%- layout "g" -%} F {% content %} F',
      g: '{%- layout "h" -%} G {% content %} G',
      h: '{%- layout "i" -%} H {% content %} H',
      i: 'I {% content %} I'
    });

    const expected = 'I H G F E D C B A This is content A B C D E F G H I';
    const template = Template.parse(fixture);
    const actual = await template.render_strict();
    assert.equal(actual, expected);
  });

  it('test_should_throw_on_exponent_recursive_layouts', async () => {
    const fixture = '{%- layout "a" -%} This is content';

    Template.layouts = new StubFileSystem({
      a: '{%- layout "b" -%} A {% content %} A',
      b: '{%- layout "c" -%} B {% content %} B',
      c: '{%- layout "a" -%} C {% content %} C'
    });

    return assert.rejects(() => {
      return Template.render_strict(fixture);
    }, err => {
      return /Dry error(.*?): Exponentially recursive layout defined: "/.test(err.message);
    });
  });
});
