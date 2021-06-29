'use strict';

const fs = require('fs');
const path = require('path');
const File = require('vinyl');
const Lexer = require('./lib/lexer');
const compile = require('./lib/compile');
const parse = require('./lib/parser');

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

const def = new File({
  path: 'default.html',
  contents: Buffer.from([
    '<!DOCTYPE html>',
    '<html lang="en">',
    'Default before',
    '{% block "body" %}',
    '{% endblock %}',
    'Default after',
    '</html>'
  ].join('\n'))
});

const base = new File({
  path: 'base.html',
  contents: Buffer.from([
    '{% layout "default.html" %}',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <title>Base layout</title>',
    '</head>',
    '<body>',
    '  Base before',
    '  {% block "body" %}',
    '  {% endblock %}',
    '  Base after',
    '</body>'
  ].join('\n'))
});

const foo = new File({
  path: 'foo.html',
  contents: Buffer.from([
    '{% layout "base.html" %}',
    'This is foo',
    '{% block "footer" %}',
    '{% endblock %}'
  ].join('\n'))
});

const files = [def, foo, base];
options.files = {
  'foo.html': foo,
  'base.html': base,
  'default.html': def
};

files.forEach(function(file) {
  parse(file, options);
});

compile(foo, options);
foo.fn();
console.log(foo.contents.toString());
