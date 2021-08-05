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
    return assert_template_result('4242', template.trim(), { data: {} }, replace);
  });

  it('test_scope_with_assign_and_only', () => {
    const template = `
      {% with data only %}
        {% assign foo = 42 %}
        {{ foo }}
      {% endwith %}
      {{ foo }}{% comment %}foo should not be visible here{% endcomment %}
    `;
    return assert_template_result('42', template.trim(), { data: {} }, replace);
  });

  it('test_with_set', () => {
    const template = `
      {% with data %}
        {% set foo = 42 %}
        {{ foo }}
      {% endwith %}
    `;
    return assert_template_result('42', template.trim(), { data: {} }, replace);
  });

  it('test_scope_with_set', () => {
    const template = `
      {% with data %}
        {% set foo = 42 %}
        {{ foo }}
      {% endwith %}
      {{ foo }}{% comment %}foo should not be visible here{% endcomment %}
    `;
    return assert_template_result('4242', template.trim(), { data: {} }, replace);
  });

  it('test_scope_with_set_and_only', () => {
    const template = `
      {% with data only %}
        {% set foo = 42 %}
        {{ foo }}
      {% endwith %}
      {{ foo }}{% comment %}foo should not be visible here{% endcomment %}
    `;
    return assert_template_result('42', template.trim(), { data: {} }, replace);
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

  it('test_does_not_have_access_to_value_from_assign_outside_current_scope', () => {
    const template = `
      {% assign bar = 'bar' %}
      {% with parent only %}
        {{ foo }} {# only foo is defined #}
        {{ bar }} {# bar is not defined #}
      {% endwith %}
    `;
    return assert_template_result('42', template.trim(), { parent: { foo: 42 } }, trim);
  });

  it('test_does_not_have_access_to_value_from_assign_outside_current_scope', () => {
    const template = `
      {% assign bar = 'bar' %}
      {% with parent %}
        {{ foo }} {# only foo is defined #}
        {{ bar }} {# bar is not defined #}
      {% endwith %}
    `;
    return assert_template_result('42bar', template.trim(), { parent: { foo: 42 } }, replace);
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

  it('test_has_access_to_value_from_parent_scope_when_dots_are_used', async () => {
    const template = `
      {% assign name = 'one' %}
      {{ name }}

      {% with ctx only %}
        {% assign name = 'two' %}
        |{{ ../name }}{{ name }}

        {% with ctx only %}
          {% assign name = 'three' %}
          |{{ ../../name }}{{ ../name }}{{ name }}

          {% with ctx only %}
            |only={{ name | default: "..." }}
          {% endwith %}

          {% with ctx %}
            |not_only={{ name | default: "..." }}
          {% endwith %}

        {% endwith %}
      {% endwith %}
    `;
    await assert_template_result('one|onetwo|onetwothree|only=...|not_only=three', template.trim(), { ctx: {} }, replace);
  });

  it.skip('test_dot_should_expose_this_context', async () => {
    const options = { allow_this_variable: true };
    const template = `
      {% assign name = 'one' %}
      {% with . only %}
        {% with . only %}
          {% with . only %}
            {{ name }}
          {% endwith %}
        {% endwith %}
      {% endwith %}
    `;
    await assert_template_result('one', template.trim(), { ctx: {} }, options, replace);
  });

  it.skip('test_dot_should_expose_this_context', async () => {
    const options = { allow_this_variable: true };
    const template = `
      {% assign name = 'one' %}
      {% with ctx %}
        {% assign name = 'two' %}
        {{ ../name }}{{ name }}
      {% endwith %}
    `;
    await assert_template_result('onetwo', template.trim(), { ctx: {} }, options, replace);
  });

  // it.only('test_dot_should_expose_this_context', async () => {
  //   const options = { allow_this_variable: true };
  //   const template = `
  //     {% assign name = 'one' %}
  //     {% with . %}
  //       1:{{ name }}
  //       {% assign name = 'two' %}
  //       {% with .. %}
  //         |2:{{ name }}
  //         {% with .. %}
  //           |3:{{ name }}
  //         {% endwith %}
  //       {% endwith %}
  //     {% endwith %}
  //   `;
  //   await assert_template_result('two', template.trim(), { ctx: {} }, options, replace);
  // });

  it('test_dot_should_expose_this_context', async () => {
    const options = { allow_this_variable: true };
    const template = `
      {% assign name = 'foo' %}
      {% with . %}
        {{ name }}
        {% with . %}
          |{{ name }}
          {% with . %}
            |{{ name }}
          {% endwith %}
        {% endwith %}
      {% endwith %}
    `;
    await assert_template_result('foo|foo|foo', template.trim(), { ctx: {} }, options, replace);
  });

  it('test_', async () => {
    const template = `
      {% assign name = 'one' %}
      {% with ctx only %}
        {{ name }}
        {% with ctx only %}
          {{ name }}
          {% with ctx only %}
            {{ name }}
          {% endwith %}
        {% endwith %}
      {% endwith %}
    `;
    await assert_template_result('', template.trim(), { ctx: {} }, replace);
  });

  it('test_has_access_to_value_from_parent_scope_when_dots_are_used', async () => {
    const template = `
      {% assign bar = 'bar' %}
      {% with parent only %}
        {{ foo }} {# only foo is defined #}
        {{ ../bar }} {# bar is not defined #}
      {% endwith %}
    `;
    await assert_template_result('42bar', template.trim(), { parent: { foo: 42 } }, replace);

    const template2 = `
      {% assign bar = 'bar' %}
      {% with a only %}
        {{ c }}
        {% with b only %}
          {{ foo }} {# only foo is defined #}
          {{ ../../bar }} {# bar is not defined #}
        {% endwith %}
      {% endwith %}
    `;
    await assert_template_result('d42bar', template2.trim(), { a: { b: { foo: 42 }, c: 'd' } }, replace);

    const assigns3 = { data: { nested: { num: 42 }, name: 'doowb' } };
    const template3 = `
       {% assign outer = 'outside' %}
       {% with data only %}
         {% assign inner = 'inside' %}
         {{ name }}
         {% with nested only %}
           {{ num }}
           {{ ../../outer }}
           {{ ../inner }}
         {% endwith %}
       {% endwith %}

       {% with data only %}
         {% assign inner = 'inside' %}
         {{ name }}
         {% with nested only %}
           {{ num }}
           {{ ../outer }}
           {{ ../inner }}
         {% endwith %}
       {% endwith %}
    `;

    await assert_template_result('doowb42outsideinsidedoowb42inside', template3.trim(), assigns3, replace);
  });

  it('test_supports_dot', () => {
    const options = { allow_this_variable: true };
    const template = `
      {% set bar = "bar" %}
      {% with bar %} {{ . }} {% endwith %}
      {% with bar %} {{ .}} {% endwith %}
      {% with bar %} {{.}} {% endwith %}
      {% with bar %} {{. }} {% endwith %}
    `;
    return assert_template_result('barbarbarbar', template.trim(), {}, options, replace);
  });

  it('test_supports_this', () => {
    const options = { allow_this_variable: true };
    const assigns = { variable: { a: 'baz' } };
    const template = `
      {% set bar = "bar" %}
      {% set foo = variable %}
      {% with bar %} {{ this }} {% endwith %}
      {% with bar %} {{this }} {% endwith %}
      {% with foo %} {{ this.a}} {% endwith %}
      {% with foo %} {{this.a}} {% endwith %}
    `;
    return assert_template_result('barbarbazbaz', template.trim(), assigns, options, replace);
  });
});
