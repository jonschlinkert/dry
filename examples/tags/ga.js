
const Dry = require('../..');

Dry.Template.register_tag('ga', require('./custom/GoogleAnalytics'));

const source = `
{% ga "G-2RJ8P0I4GC" %}
{% ga 'G-2RJ8P0I4GC' %}
{% ga \`G-2RJ8P0I4GC\` %}
{% ga google_analytics_id %}
{% ga foo | default: "G-2RJ8P0I4GC" %}
{{ foo | default: "G-2RJ8P0I4GC" }}
`;

const template = Dry.Template.parse(source);
const output = template.render({ google_analytics_id: 'G-2RJ8P0I4GC' });
console.log(output);
