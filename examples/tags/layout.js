'use strict';

const Dry = require('../..');
const { Template } = Dry;

const layouts = {
  base: `
<!DOCTYPE html>
<html>
  <head>
    {% block head %}
    <title>{% block title %}Default Title{% endblock %}</title>
    {% endblock %}
  </head>
  <body>
    {% block content %}<main></main>{% endblock %}
    {% block footer %}<footer> Default footer </footer>{% endblock %}
  </body>
</html>
  `
};

const source = `
{% extends "base.html" %}

{% block title %}Home{% endblock %}
{% block head %}
  {{ parent() }}
  <style type="text/css">
    .important { color: #336699; }
  </style>
{% endblock %}
{% block content %}
  <h1>Index</h1>
  <p class="important">
    Welcome on my awesome homepage.
  </p>
{% endblock %}
`;

const template = Template.parse(source);
template.render({}, { layouts })
  .then(console.log)
  .catch(console.error);
