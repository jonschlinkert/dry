'use strict';

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

Dry.Template.layouts = new StubFileSystem({
  'default.html': 'Before{% content %}After'
});

const source = `---
title: base.html
layout: default.html
---

This is {{title}}.
`;

Dry.Template.render_strict(source)
  .then(console.log)
  .catch(console.error);
