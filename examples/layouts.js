'use strict';

const Dry = require('..');

const layouts = {
  default: {
    path: 'default.html',
    contents: Buffer.from([
      '<!DOCTYPE html>',
      '<html lang="en">',
      '  Default before',
      '  {% block "body" %}',
      '  Nothing yet.',
      '  {% endblock %}',
      '  Default after',
      '</html>'
    ].join('\n'))
  },
  base: {
    path: 'base.html',
    contents: Buffer.from([
      '{% layout "default.html" %}',
      '{% block "head" %}',
      '<head>',
      '  <meta charset="UTF-8">',
      '  <title>{{ title }}</title>',
      '</head>',
      '{% endblock %}',
      '<body>',
      '  Base before',
      '  {% block "body" %}',
      '  {% endblock %}',
      '  {{ content }}',
      '  Base after',
      '</body>'
    ].join('\n'))
  }
};

const file = {
  path: 'home.html',
  contents: `---
layout: base.html
title: Home
---
<h1>This is {{title}}</h1>
{% block "head" %}
  <title>{{ title }}</title>
{% endblock %}
{% block "footer" %}
{% endblock %}
  `
};

const template = Dry.Template.parse(file.contents, { path: file.path });

template.render({}, { layouts })
  .then(console.log)
  .catch(console.error);

// Dry.Template.parse(file.contents, { path: file.path });
