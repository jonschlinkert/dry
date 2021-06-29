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

Dry.Template.file_system = new FileSystem({
  'vertical_boxes_skeleton.liquid': `
  {{ foo }}
  {{ bar }}
<div class="top_box">
  {%- block top %}Top box default content{% endblock %}
</div>

<div class="middle_box">
  {% block middle %}Middle box default content{% endblock %}
</div>

<div class="bottom_box">
  {% block bottom %}Bottom box default content{% endblock %}
</div>

{% block footer -%}
<footer>This is the footer</footer>
{% endblock %}
`
});

const source = `
Before
{% embed "vertical_boxes_skeleton.liquid" with data %}
  {% block top %}
  Some content for the top box
  {%- endblock %}

  {% block bottom -%}
  Some content for the bottom box
  {%- endblock %}
{% endembed %}
After
`;

const template = Dry.Template.parse(source, { path: 'source.html' });
console.log(template.render({ data: { foo: 'one', bar: 'two' } }));
