
const Dry = require('../..');

class FileSystem {
  constructor(files) {
    this.files = files;
  }

  read_template_file(path) {
    return this.files[path];
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
    {%- extends "layouts/base.html" -%}
    {% block content %}{{ parent() }}Foo content{% endblock %}
    {% block footer %}{{ parent() }}Foo footer{% endblock %}
    `,
    'bar.html': `
    {%- extends "layouts/foo.html" %}
    {% block content mode="append" %}{{ parent() }}Bar content{% endblock %}
    {% block footer mode="append" %}{{ parent() }}Bar footer{% endblock %}
    `,
    'baz.html': `
    {%- extends "layouts/bar.html" %}
    {% block content mode="append" %}Baz content{% endblock %}
    {% block footer mode="append" %}Baz footer{% endblock %}
    `
  }
};

Dry.Template.file_system = new FileSystem(templates2);

const source = `
{%- extends "layouts/foo.html" -%}
{%- block head %} <title>Home</title> {% endblock -%}
{%- block content mode="append" %} New content {% endblock -%}
`;

// const block = `
// {% block content mode="append" %} New content {% endblock %}
// `;

const template = Dry.Template.parse(source, { path: 'source.html' });
template.render({}, { registers: templates2 }).then(console.log);
