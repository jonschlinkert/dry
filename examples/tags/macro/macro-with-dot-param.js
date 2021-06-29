'use strict';

const Dry = require('../../..');

const source = `
{%- macro foo(a, b=true, c=foo.bar, d) %}
  a: {{a}}
  b: {{b}}
  c: {{c}}
  {% if d %}d: {{d}}{% endif %}
{% endmacro %}

{% assign args1 = [undefined, foo.baz, 'gamma'] %}
{% assign args = [...args1, "alpha", "beta"] %}

<div>{{ foo('doowb', ...args, "whatever") }}</div>
`;

// <div>{{ foo() }}</div>
// <div>{{ foo("one", false, foo.baz, 'd') }}</div>

const template = Dry.Template.parse(source);
console.log(template.render({ data: { foo: 'one', bar: 'two' }, foo: { bar: 'from context', baz: 'other from context' } }));
