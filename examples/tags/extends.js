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

const templates2 = {
  layouts: {
    'base.html': `
  <!DOCTYPE html>
  <html>
    <head>
      {% block head %}{% endblock %}
    </head>
    <body>
      {% block content %}Default content{% endblock %}
      {% block footer %}<footer> Default footer </footer>{% endblock %}
    </body>
  </html>
    `,
    'foo.html': `
    {% extends "layouts/base.html" %}
    {% block content %}Foo content{% endblock %}
    {% block footer %}Foo footer{% endblock %}
    `,
    'bar.html': `
    {% extends "layouts/foo.html" %}
    {% block content %}Bar content{% endblock %}
    {% block footer %}{{ block.super() }}Bar footer{% endblock %}
    `,
    'baz.html': `
    {% extends "layouts/bar.html" %}
    {% block content %}Baz content{% endblock %}
    {% block footer %}Baz footer{% endblock %}
    `
  }
};

Dry.Template.file_system = new FileSystem(templates2);

const source = `
{% extends "layouts/foo.html" %}
{% block content mode="append" %} New content {% endblock %}
`;

// const block = `
// {% block content mode="append" %} New content {% endblock %}
// `;

const template = Dry.Template.parse(source, { path: 'source.html' });
template.render({}, { registers: templates2 }).then(console.log);
