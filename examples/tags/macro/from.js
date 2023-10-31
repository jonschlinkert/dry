
// const path = require('path');
const Dry = require('../../..');
const { FileSystem: { LocalFileSystem } } = Dry;
const file_system = new LocalFileSystem(__dirname);

const source = [
  '{%- import "signup" as forms -%}',
  '{%- from "macros" import hello -%}',
  '{%- import "macros" as foo -%}',
  '',
  '{%- assign bar = foo -%}',
  'Bar: {{ bar.one() }}',
  'Bar: {{ bar.two() }}',
  'Bar: {{ bar.three() }}',
  'Bar: {{ bar.four() }}',
  '----',
  'Foo: {{ foo.one() }}',
  'Foo: {{ foo.two() }}',
  'Foo: {{ foo.three() }}',
  'Foo: {{ foo.four() }}',
  // '',
  '{%- if foo.hello is defined -%}',
  '  {{- foo.hello() -}}',
  '  {{- foo.hello("Jon") -}}',
  '  {%- for i in (1..3) -%}',
  '    {{- foo.hello(i) -}}',
  '  {%- endfor -%}',
  '{%- endif -%}',
  '',
  '{% if hello -%}',
  'OK',
  '{% endif %}',
  '',
  '<p>{{ forms.input("username") }}</p>',
  '<p>{{ forms.input("password", null, "password") }}</p>',
  '',
  '<hr>',
  '',
  '<p>{{ forms.textarea("bio") }}</p>'
].join('\n');

const source2 = `
{% from 'forms.html' import input as input_field, textarea %}

<p>{{ input_field('password', '', 'password') }}</p>
<p>{{ textarea('comment') }}</p>
`;

const template = Dry.Template.parse(source);
template.render({}, { registers: { file_system } })
  .then(console.log)
  .catch(console.error);

