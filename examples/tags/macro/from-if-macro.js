'use strict';

// const path = require('path');
const Dry = require('../../..');
const { FileSystem: { LocalFileSystem } } = Dry;
const file_system = new LocalFileSystem(__dirname);

const source = [
  '{%- import "signup" as forms -%}',
  '{%- from "macros" import hello -%}',
  '{%- import "macros" as foo -%}',
  // '',
  // '{{ macros.one() }}',
  // '{{ macros.two() }}',
  // '{{ macros.three() }}',
  // '{{ macros.four() }}',
  // '',
  // '{{ foo.one() }}',
  // '{{ foo.two() }}',
  // '{{ foo.three() }}',
  // '{{ foo.four() }}',
  '',
  '{%- if macros.hello is defined -%}',
  '  {{ macros.hello() }}',
  '  {{ macros.hello("Jon") }}',
  // '  {%- for i in (1..3) -%}',
  // '    {{- macros.hello(i) }}',
  // '  {%- endfor -%}',
  '{%- endif -%}',
  '',
  '{% if hello is defined -%}',
  '  OK',
  '{% endif %}'
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
