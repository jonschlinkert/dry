'use strict';

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
  'base.html': `
{% block 'sidebar' %}
  This is from base.html
{% endblock %}
`
};

const source = `
{% extends "base.html" %}
{% block 'sidebar' %}
  <h3>Table Of Contents</h3>
  ...
  {{ super() }}
{% endblock %}
`;

Template.file_system = new FileSystem(templates);

Template
  .parse(source, { path: 'source.html' })
  .render_strict()
  .then(console.log);
