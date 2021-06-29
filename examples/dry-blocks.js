'use strict';

const Dry = require('..');

const options = {
  tags: {
    layout: {
      name: 'layout',
      block: 'body'
    },
    extends: {
      name: 'extends',
      block: null
    }
  }
};

const layouts = {
  default: {
    path: 'default.html',
    contents: `
<!DOCTYPE html>
<html lang="en">
  Default before
  {% block "body" %}
    Nothing yet.
  {% endblock %}
  Default after
</html>
    `
  },
  base: {
    path: 'base.html',
    contents: `
{% layout "default.html" %}
  {% block "head" %}
  <head>
    <meta charset="UTF-8">
    <title>Base layout</title>
  </head>
  {% endblock %}
  <body>
    Base before
    {% block "body" %}
    {% endblock %}
    Base after
  </body>
  `
  }
};

const pages = {
  home: {
    path: 'home.html',
    contents: `
{% layout "base.html" %}
This is {{title}}
{% block "head" %}
<title>{{title}}</title>
{% endblock %}
{% block "footer" %}
{% endblock %}
  `
  }
};
