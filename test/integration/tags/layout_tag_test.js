'use strict';

const assert = require('assert').strict;
const { Template } = require('../../..');
const { StubFileSystem } = require('../../test_helpers');

describe('layout_tag_test', () => {
  it('test_content_variable', async () => {
    const fixture = `
      {%- layout "default" -%}
          The content`;

    const layouts = Template.layouts = new StubFileSystem({
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
    const actual = await template.render_strict(undefined, { registers: { layouts } });
    assert.equal(actual, expected);
  });

  it('test_nested_layouts', async () => {
    const fixture = '{%- layout "a" -%} This is content';

    const layouts = Template.layouts = new StubFileSystem({
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
    const actual = await template.render_strict(undefined, { registers: { layouts } });
    assert.equal(actual, expected);
  });

  it('test_should_throw_on_exponentially_recursive_layouts', async () => {
    const fixture = '{%- layout "a" -%} This is content';

    const layouts = Template.layouts = new StubFileSystem({
      a: '{%- layout "b" -%} A {% content %} A',
      b: '{%- layout "c" -%} B {% content %} B',
      c: '{%- layout "a" -%} C {% content %} C'
    });

    return assert.rejects(() => {
      return Template.render_strict(fixture, undefined, { registers: { layouts } });
    }, /Dry error: Exponentially recursive layout defined: "\{% layout "a" %\}"/);
  });
});
