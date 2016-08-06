'use strict';

var fs = require('fs');
var path = require('path');
var File = require('vinyl');
var Lexer = require('./lib/lexer');
var compile = require('./lib/compile');
var parse = require('./lib/parser');

var options = {
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

var def = new File({
  path: 'default.html',
  contents: new Buffer([
    '<!DOCTYPE html>',
    '<html lang="en">',
    'Default before',
    '{% block "body" %}',
    '{% endblock %}',
    'Default after',
    '</html>',
  ].join('\n'))
});

var base = new File({
  path: 'base.html',
  contents: new Buffer([
    '{% layout "default.html" %}',
    '  <head>',
    '    <meta charset="UTF-8">',
    '    <title>Base layout</title>',
    '  </head>',
    '  <body>',
    '    Base before',
    '    {% block "body" %}',
    '    {% endblock %}',
    '    Base after',
    '  </body>',
  ].join('\n'))
});

var foo = new File({
  path: 'foo.html',
  contents: new Buffer([
    '{% layout "base.html" %}',
    'This is foo',
    '{% block "footer" %}',
    '{% endblock %}',
  ].join('\n'))
});

var files = [def, foo, base];
options.files = {
  'foo.html': foo,
  'base.html': base,
  'default.html': def
};

files.forEach(function(file) {
  parse(file, options);
});

compile(foo, options);
foo.fn()
console.log(foo.contents.toString());
