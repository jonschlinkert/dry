
const { Template } = require('../..');

class FileSystem {
  constructor(values) {
    this.values = values;
  }
  read_template_file(name) {
    return this.values[name];
  }
}

const templates = {
  'common_blocks.liquid': `
{% block 'title' %}
  This is from comment_blocks.liquid
{% endblock %}
  `
};

const source = `
{% extends "common_blocks.liquid" %}
{% block 'title' %}This is a title{% endblock %}
{% block 'footer' %}This is a footer{% endblock %}
<title>{{ block('title') }}</title>
<h1>{{ block('title') }}</h1>

<title>{{ block("title", "common_blocks.liquid") }}</title>

<title>{{ block('title') }}</title>
<h1>{{ block('title') }}</h1>

{% if block("footer") is defined %}
  Footer is defined
{% endif %}

`;

Template.file_system = new FileSystem(templates);

Template.render_strict(source, {}, { path: 'source.html' })
  .then(console.log)
  .catch(console.error);
