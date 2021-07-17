'use strict';

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
  '{{- bar.one() }}',
  '{{- bar.two() }}',
  '{{- bar.three() }}',
  '{{- bar.four() }}',
  '',
  '{{- foo.one() }}',
  '{{- foo.two() }}',
  '{{- foo.three() }}',
  '{{- foo.four() }}',
  // '',
  '{%- if macros.hello is defined -%}',
  '  {{- macros.hello() -}}',
  '  {{- macros.hello("Jon") -}}',
  '  {%- for i in (1..3) -%}',
  '    {{- macros.hello(i) -}}',
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

