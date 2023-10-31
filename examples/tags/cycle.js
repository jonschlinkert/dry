
const Dry = require('../..');
const { Template } = Dry;

const source = `
{%- for i in (1..10) -%}
{% cycle 1,2,3 -%}{%- assign n = i % 2 -%}
{%- if n == 0 %}
  A
{% else %}
  B
{% endif %}
{%- endfor -%}
`;

const template = Template.parse(source, { path: 'source.html' });
template.render({}).then(console.log).catch(console.error);

