/* eslint-disable no-unused-vars */
'use strict';

const Lexer = require('./lib/Lexer');
const Parser = require('./lib/Parser');
const Template = require('./lib/Template');

const input = `
{%- for currency in shop["enabled_currencies"] -%}

  {%- if currency == cart.currency -%}
    <option selected="true">{{currency.iso_code}}</option>
  {%- elsif currency == shop.default_currency -%}
    <option selected="true">{{currency.iso_code}}</option>
  {%- elsif currency == shop.other_currency -%}
    <option selected="true">{{currency.iso_code}}</option>
  {%- elsif currency == shop.some_currency -%}
    <option selected="true">{{currency.iso_code}}</option>
  {%- elsif currency == shop.last_currency -%}
    <option selected="true">{{currency.iso_code}}</option>
  {%- else -%}
    <option>{{currency.iso_code}}</option>
  {%- endif -%}

{%- else -%}
  No available options.
{%- endfor -%}

{# comment #}
  This is a twig comment
{# endcomment #}
`;

// {% for letter of ("a".."z") %}
const input2 = `
Before
{% for letter of letters %}
  {% for letter of letters %}
    {% for letter of letters %}
      {% for letter of letters %}
        {% for letter of letters %}
          - {{letter}}
        {% endfor %}
      {% endfor %}
    {% endfor %}
  {% endfor %}
{% endfor %}
After
`;

const input2a = `
Before
{% for group of letters offset:2 limit:3 %}
  {%- for letter of group %}
    - {{forloop.parentloop.index0}}:{{forloop.index0}} {{letter | upcase | prepend: "-foo-" | repeat:5 }}
  {%- endfor %}
{% else %}
  No letters :(
{% endfor %}
After
`;

const input2b = `
Before
{% if test == false %}
  {% for group of letters offset:2 limit:3 %}
    {%- for letter of group %}
      - {{forloop.parentloop.index0}}:{{forloop.index0}} {{letter | upcase | prepend: "-foo-" | repeat:5 }}
    {%- endfor %}
  {% else %}
    No letters :(
  {% endfor %}
{% endif %}
After
`;

const input3 = `
Before
{#- comment #}
  This is a twig comment
{# endcomment #}
After

`;

// const input = `
// {% for name in names %}
// {{name}}
// {% else %}
//   No names :(
// {% endfor %}
// `;

// const lexer = new Lexer(input);
// const tokens = lexer.lex();
// console.log(tokens);

// console.log(new Lexer('{{ foo["bar"] }}').lex());
// const tokens = lexer.lex();
// console.log(tokens);

// const parser = new Parser(input);
// const { ast } = parser.parse();
// console.log(ast.nodes[1].branches[0]);

Template.register_filter({
  upcase(value) {
    return value.toUpperCase();
  },
  duplicate(value, { times = 2 }) {
    return value.repeat(times);
  }
});

const fixture = `
{% for inner in outer %}
  {% for k in inner -%}
    {{ forloop.parentloop.index0 }}
  {%- endfor %}
{% endfor %}
`;

const template = new Template();
template.parse(input2b);
console.log(template.root.ast.value.toString() === input2b)
// const { root } = template;
// console.log(root);
// console.log(root.nodes[0]);
// console.log(root.nodes[1].nodes);
// console.log(root.nodes[1].nodes[2].nodes[2].nodes[2].nodes[2]);

const output = template.render({
  // letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g']
  letters: [
    ['a', 'a', 'a'],
    ['b', 'b', 'b'],
    ['c', 'c', 'c'],
    ['d', 'd', 'd'],
    ['e', 'e', 'e'],
    ['f', 'f', 'f'],
    ['g', 'g', 'g']
  ],
  outer: [ [1, 1, 1], [1, 1, 1] ],
  test: false
});

console.log(output);

// const rangeRegex = /^\s*\(\s*(?:(\S+)\s*\.\.)\s*(\S+)\s*\)\s*/;
// console.log(rangeRegex.exec('(1.2.a.b)'));

// // const re = /^(?:(?:.(?!(?:{[{%]|[%}]})))+|\s+)/;
// const re = /^(?:(?:.(?=\b|[\s\w]+)|\s)+)/;
// console.log(re.exec('foo bar baz {% qux %}'));

// const quotedFragmentRe = /("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|(?:\\.|[^\s,|'"]|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')+)(.*)/m;
// const filterMarkupRe = /\|\s*(.*)/m;
// const filterParser = /(?:\s+|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|(?:\\.|[^\s,|'"]|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')+|,)+/g;
// // console.log(quotedFragmentRe.exec('foo["bar"] | reversed, another'));
// // const match = quotedFragmentRe.exec('"some text" | other: true | something: else | another ');
// const match = quotedFragmentRe.exec('foo["bar"] | reversed, another | and,another: foo');
// const [, name, filter_markup] = match;
// console.log({ name, filter_markup });

// const m = filterMarkupRe.exec(filter_markup);
// console.log(...m[1].matchAll(filterParser));
