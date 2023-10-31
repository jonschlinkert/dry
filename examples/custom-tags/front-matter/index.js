
const Dry = require('../..');

class StubFileSystem {
  constructor(files) {
    this.files = files;
  }

  read_template_file(path) {
    return this.files[path];
  }
}

// register custom lexer and tag
Dry.Lexer = require('./Lexer');
Dry.Template.register_tag('frontmatter', require('./tags/FrontMatter'));
Dry.nodes.Root = require('./nodes/Root');

Dry.Template.layouts = new StubFileSystem({
  'base.html': `
<!DOCTYPE html>
<html lang="en">
  {% content %}
</html>
  `,
  'default.html': `
{% layout "base.html" -%}
  <head>
    <title>{{ title }}</title>
  </head>
  <body>
    {% content %}
  </body>`
});

const source = `---
title: Content
layout: default.html
---
This is {{title}}.`;

Dry.Template.render_strict(source)
  .then(console.log)
  .catch(console.error);
