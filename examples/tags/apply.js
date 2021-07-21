'use strict';

const Dry = require('../..');

const source = `
{%- apply upcase -%}
This is inner
{% endapply %}

{%- apply split: '' | join: '-' -%}
{% apply upcase -%}
This is inner
{%- endapply %}
This is outer
{%- endapply %}

This should not render:{{ apply }}
`;

const template = Dry.Template.parse(source);
console.log(template.render());
