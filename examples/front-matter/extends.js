'use strict';

const Dry = require('../..');

class FileSystem {
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

const registers = Dry.Template.file_system = new FileSystem({
  'parent.html': `
{% block "content" %}
The main block.
{% endblock %}
`
});

Dry.Template.layouts = new FileSystem({
  'base.html': `
<!DOCTYPE html>
<html lang="en">
  {% content %}
</html>
  `,
  'default.html': `
{% layout "base.html" -%}
{% extends "parent.html" -%}
{% block "content" %}
  <head>
    <title>{{ title }}</title>
  </head>
  <body>
    {% content %}
  </body>
{% endblock %}`
});

const source = `---
title: Content
layout: default.html
---
This is {{title}}.`;

Dry.Template.render_strict(source, undefined, { registers })
  .then(console.log)
  .catch(console.error);
