'use strict';

const Dry = require('../..');

class FileSystem {
  constructor(values) {
    this.values = values;
  }
  read_template_file(template_path) {
    return this.values[template_path];
  }
}

const templates = {
  'common_blocks.liquid': `
{% block title %}
  This is from comment_blocks.liquid
{% endblock %}
  `
};

const source = `
{% block title %}This is a title{% endblock %}
{% block footer %}This is a footer{% endblock %}

<title>{{ block('title') }}</title>
<h1>{{ block('title') }}</h1>

<title>{{ block("title", "common_blocks.liquid") }}</title>

<title>{{ block('title') }}</title>
<h1>{{ block('title') }}</h1>

{% if block("footer") is defined %}
  Footer is defined
{% endif %}
`;

Dry.Template.file_system = new FileSystem(templates);

const template = Dry.Template.parse(source, { path: 'source.html' });
template.render_strict().then(console.log);
