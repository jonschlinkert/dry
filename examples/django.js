'use strict';

const Dry = require('..');

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
<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="style.css">
    <title>{% block title %}My amazing site{% endblock %}</title>
  </head>

  <body>
    <div id="sidebar">
      {% block sidebar %}
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/blog/">Blog</a></li>
      </ul>
      {% endblock %}
    </div>
    <div id="content">
      {% block content %}{% endblock %}
    </div>
  </body>
</html>
  `
};

const source = `
{% extends "base.html" %}

{% block title %}My amazing blog{% endblock %}

{% block content %}
{% for entry in blog_entries %}
  <h2>{{ entry.title }}</h2>
  <p>{{ entry.body }}</p>
{% endfor %}
{% endblock %}
`;

Dry.Template.file_system = new FileSystem(templates);

const locals = {
  blog_entries: [
    { title: 'Entry one', body: 'This is my first entry.' },
    { title: 'Entry two', body: 'This is my second entry.' }
  ]
};

Dry.Template.render_strict(source, locals, { strict_variables: true, strict_filters: true })
  .then(console.log)
  .catch(console.error);
