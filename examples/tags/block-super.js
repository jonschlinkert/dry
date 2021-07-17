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
  'base.html': `
{% block sidebar %}
  This is from base.html
{% endblock %}
  `
};

const source = `
{% extends "base.html" %}

{% block sidebar %}
    <h3>Table Of Contents</h3>
    ...
    {{ super() }}
{% endblock %}
`;

Dry.Template.file_system = new FileSystem(templates);

const template = Dry.Template.parse(source, { path: 'source.html' });
template.render_strict().then(console.log);
