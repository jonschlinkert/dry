'use strict';

const { assert_template_result } = require('../../test_helpers');
const trim = s => s.trim();
const replace = s => s.replace(/\s+/g, '');

describe('with_tag_test', () => {
  it('test_with', async () => {
    const tmpl = v => `{% with ${v} %}{{ name }}{% endwith %}`;
    await assert_template_result('', tmpl('a only'), { name: 'doowb' });
    await assert_template_result('doowb', tmpl('a'), { a: { name: 'doowb' } });
    await assert_template_result('doowb', tmpl('a.b'), { a: { b: { name: 'doowb' } } });
  });

  it('test_with_assign', () => {
    const template = `
      {% with data %}
        {% assign foo = 42 %}
        {{ foo }}
      {% endwith %}
    `;
    return assert_template_result('42', template.trim(), { data: {} }, trim);
  });

  it('test_scope_with_assign', () => {
    const template = `
      {% with data %}
        {% assign foo = 42 %}
        {{ foo }}
      {% endwith %}
      {{ foo }}{% comment %}foo should not be visible here{% endcomment %}
    `;
    return assert_template_result('42', template.trim(), { data: {} }, trim);
  });

  it('test_with_set', () => {
    const template = `
      {% with data %}
        {% set foo = 42 %}
        {{ foo }}
      {% endwith %}
    `;
    return assert_template_result('42', template.trim(), { data: {} }, trim);
  });

  it('test_scope_with_set', () => {
    const template = `
      {% with data %}
        {% set foo = 42 %}
        {{ foo }}
      {% endwith %}
      {{ foo }}{% comment %}foo should not be visible here{% endcomment %}
    `;
    return assert_template_result('42', template.trim(), { data: {} }, trim);
  });

  it.skip('test_with_object_defined_inline', () => {
    const template = `
      {% with { foo: 42 } %}
        {{ foo }} {# foo is 42 here #}
      {% endwith %}
    `;
    return assert_template_result('42', template.trim(), { data: {} }, trim);
  });

  it.skip('test_works_with_value_from_assign_in_parent_scope', () => {
    const template = `
      {% assign vars = { foo: 42 } %}
      {% with vars %}
        {{ foo }}
      {% endwith %}
    `;
    return assert_template_result('42', template.trim(), { data: {} }, trim);
  });

  it('test_works_with_value_from_set_in_parent_scope', () => {
    const template = `
      {% set vars = parent %}
      {% with vars %}
        {{ foo }}
      {% endwith %}
    `;
    return assert_template_result('42', template.trim(), { parent: { foo: 42 } }, trim);
  });

  it('test_does_not_have_access_to_value_from_assign_in_parent_scope', () => {
    const template = `
      {% assign bar = 'bar' %}
      {% with parent only %}
        {{ foo }} {# only foo is defined #}
        {{ bar }} {# bar is not defined #}
      {% endwith %}
    `;
    return assert_template_result('42', template.trim(), { parent: { foo: 42 } }, trim);
  });

  it('test_does_not_have_access_to_value_from_set_in_parent_scope', () => {
    const template = `
      {% set bar = 'bar' %}
      {% with parent only %}
        {{ foo }} {# only foo is defined #}
        {{ bar }} {# bar is not defined #}
      {% endwith %}
    `;
    return assert_template_result('42', template.trim(), { parent: { foo: 42 } }, trim);
  });

  it('test_supports "."', () => {
    const template = `
      {% set bar = "bar" %}
      {% with bar %} {{ . }} {% endwith %}
      {% with bar %} {{ .}} {% endwith %}
      {% with bar %} {{.}} {% endwith %}
      {% with bar %} {{. }} {% endwith %}
    `;
    return assert_template_result('barbarbarbar', template.trim(), null, replace);
  });

  it('test_supports "this"', () => {
    const assigns = { variable: { a: 'baz' } };
    const template = `
      {% set bar = "bar" %}
      {% set foo = variable %}
      {% with bar %} {{ this }} {% endwith %}
      {% with bar %} {{this }} {% endwith %}
      {% with foo %} {{ this.a}} {% endwith %}
      {% with foo %} {{this.a}} {% endwith %}
    `;
    return assert_template_result('barbarbazbaz', template.trim(), assigns, replace);
  });
});
