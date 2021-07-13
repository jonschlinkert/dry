'use strict';

const Dry = require('../../..');

const source = `
<p>{{ input('password', '', 'password') }}</p>

{% macro input(name, value, type = "text", size = 20) %}
  <input type="{{ type }}" name="{{ name }}" value="{{ value|e }}" size="{{ size }}"/>
{% endmacro %}

{% macro foo(a, b=true, c=variable, d) %}
  a: {{a}}
  b: {{b}}
  c: {{c}}
  d: {{d}}
{% endmacro %}

<div>{{ foo() }}</div>

---

<div>{{ foo("one", "<div>Inside</div>", undefined, "ddd") }}</div>

---

<div>{{ input("username", "<div>Inside</div>", undefined) }}</div>
`;

const template = Dry.Template.parse(source);
template.render({ data: { foo: 'one', bar: 'two' }, variable: 'from context' })
  .then(console.log)
  .catch(console.error);
