
const { Template } = require('..');

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
<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="style.css">
    <title>{% block title %}My amazing site{% endblock %}</title>
  </head>
  <body>
    <div id="sidebar">
      {% block sidebar -%}
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
  {%- block content -%}
    {% if blog_entries.length >= 2 %}
    <ul>
    {%- for entry in blog_entries %}
      <li>
        <h2>{{ entry.title }}</h2>
        <p>{{ entry.body }}</p>
      </li>
    {% endfor -%}
    </ul>
    {% endif -%}
  {% endblock %}
`;

Template.file_system = new FileSystem(templates);

const locals = {
  blog_entries: [
    { title: 'Entry one', body: 'This is my first entry.' },
    { title: 'Entry two', body: 'This is my second entry.' }
  ]
};

Template.render_strict(source, locals, { strict_variables: true, strict_filters: true })
  .then(console.log)
  .catch(console.error);
