'use strict';

const path = require('path');
const assert = require('assert').strict;
const { assert_template_result } = require('../../test_helpers');
const { Template, FileSystem: { LocalFileSystem }, utils } = require('../../..');

const macros_path = path.resolve(__dirname, '../../fixtures/_macros');
const file_system = Template.file_system;

const usage = (name, args = []) => `{{ ${name}(${args.join(', ')}) }}`;
const macro = (name, text, args = []) => {
  return `{% macro ${name}(${args.join(', ')}) %}${text}{% endmacro %}`;
};

describe('macro_tag_test', () => {
  after(() => {
    Template.file_system = file_system;
  });

  beforeEach(() => {
    Template.file_system = new LocalFileSystem(macros_path);
    Template.file_system.pattern = '%s.html';
  });

  describe('not found', () => {
    it('test_renders_and_empty_string_when_not_called', async () => {
      await assert_template_result('', macro('foo', 'test string'), {});
    });
  });

  describe('macro name', () => {
    it('test_finds_macro_when_name_is_prefixed_with_macros', async () => {
      const fixture = macro('foo', 'test string') + usage('macros.foo');
      await assert_template_result('test string', fixture, {});
    });
  });

  describe('inline macros', () => {
    it('test_should_render_inline_macros', async () => {
      const fixture = `
        <p>{{ hello('doowb') }}</p>
        ${macro('hello', 'Hello, {{ name }}!')}
      `;
      const template = Template.parse(fixture);
      const actual = await template.render({ name: 'doowb' });
      assert.equal(actual.trim(), '<p>Hello, doowb!</p>');
    });

    it('test_should_render_inline_macros', async () => {
      const fixture = `
      <p>{{ hello('doowb') }}</p><p>{{ goodbye('doowb') }}</p>
      ${macro('hello', 'Hello, {{ name }}!')}
      ${macro('goodbye', 'Goodbye, {{ name }}:(')}
    `;
      const template = Template.parse(fixture);
      const actual = await template.render({ name: 'doowb' });
      assert.equal(actual.trim(), '<p>Hello, doowb!</p><p>Goodbye, doowb:(</p>');
    });
  });

  describe('macro params', () => {
    it('test_should_render_macros_with_default_params', async () => {
      const fixture = `
      {% macro foo(data, b=true, c=variable, d) %}
        a: {{data.foo}}
        b: {{b}}
        c: {{c}}
        d: {{data.bar}}
      {% endmacro %}

      <div>{{ foo() }}</div>
    `;

      const expected = `
      <div>
        a: one
        b: true
        c: from context
        d: two
      </div>
    `;

      const template = Template.parse(fixture);
      const actual = await template.render({ data: { foo: 'one', bar: 'two' }, variable: 'from context' });
      assert.equal(actual.trim(), expected.trim());
    });
  });

  describe('import tag', () => {
    it('test_should_import_macros_from_file_system', async () => {
      const assigns = { name: 'doowb' };
      await assert_template_result('Hello, doowb!', '{% import "simple" %}' + usage('simple.hello'), assigns);
    });

    it('test_allow_multiple_imports', async () => {
      const fixture = '{% import "simple" %}{% import "fields" %}'
        + usage('fields.input')
        + usage('simple.hello');

      const assigns = { name: 'doowb' };
      await assert_template_result('\n  <input type="text" name="doowb" value="" size="20"/>\nHello, doowb!', fixture, assigns);
    });

    it('test_should_throw_when_file_is_not_found', async () => {
      const fixture = '{% import "doesnt" %}' + usage('doesnt.exist');
      const template = Template.parse(fixture, { strict_errors: true });

      return assert.rejects(() => {
        return template.render_strict();
      }, /Dry error \(line 1\): Cannot locate template: 'doesnt'/);
    });

    it('test_should_import_macros_from_file_system', async () => {
      const fixture = `
        {% import "signup" as forms %}

        The above import call imports the forms.html file (which can contain only macros, or a template and some macros), and import the macros as items of the forms local variable.

        The macros can then be called at will in the current template:

        <p>{{ forms.input('username') | trim }}</p>
        <p>{{ forms.input('password', null, 'password') | trim }}</p>

        <hr>

        <p>{{ forms.textarea('bio') | trim }}</p>
      `;

      const expected = `
        The above import call imports the forms.html file (which can contain only macros, or a template and some macros), and import the macros as items of the forms local variable.

        The macros can then be called at will in the current template:

        <p><input type="text" name="username" value="" size="20"/></p>
        <p><input type="password" name="password" value="" size="20"/></p>

        <hr>

        <p><textarea name="bio" rows="10" cols="40"></textarea></p>
      `;

      const template = Template.parse(fixture);
      const actual = await template.render({ name: 'doowb' });
      assert.equal(utils.unindent(actual), utils.unindent(expected));
    });
  });

  // it('test_macros_content', async () => {
  //   Template.file_system = new StubFileSystem({ source: 'test string' });
  //   await assert_template_result('test string', "{% macro 'source' %}{% endmacro %}", {});
  // });

  // it('test_macros_content_from_blocks', async () => {
  //   await assert_template_result('topbottom', "{% macro 'source' %}{% endmacro %}", {});
  // });

  // it('test_overrides_content_from_blocks', async () => {
  //   await assert_template_result('overriddenbottom', "{% macro 'source' %}{% block top %}overridden{% endblock %}{% endmacro %}", {});
  // });

  // it('test_assign_inside_block', async () => {
  //   const fixture = '{% macro \'source\' %}{% block top %}{% assign var = \'_assigned\' %}overridden{{var}}{% endblock %}{% endmacro %}';
  //   await assert_template_result('overridden_assignedbottom', fixture, {});
  // });

  // it('test_assign_outside_block', async () => {
  //   const fixture = '{% macro "source" %}{% assign var = "_assigned" %}{% block top %}overridden{{var}}{% endblock %}{% endmacro %}';
  //   await assert_template_result('overriddenbottom', fixture, {});
  // });

  // it('test_macro_with', async () => {
  //   const fixture = '{% macro "source" with a %}{% block top %}{{b}}{% endblock %}{% endmacro %}';
  //   await assert_template_result('new topbottom', fixture, { a: { b: 'new top' } });
  // });
});

