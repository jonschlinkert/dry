'use strict';

var fs = require('fs');
var path = require('path');
var File = require('vinyl');
var dry = require('..');

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
    'Nothing yet.',
    '{% endblock %}',
    'Default after',
    '</html>',
  ].join('\n'))
});

var base = new File({
  path: 'base.html',
  contents: new Buffer([
    '{% layout "default.html" %}',
    '  {% block "head" %}',
    '  <head>',
    '    <meta charset="UTF-8">',
    '    <title>Base layout</title>',
    '  </head>',
    '  {% endblock %}',
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
    'This is {{title}}',
    '{% block "head" %}',
    '<title>{{title}}</title>',
    '{% endblock %}',
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
  dry.parse(file, options);
});

var res = dry(foo, options);
console.log(res.contents.toString());
