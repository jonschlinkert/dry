'use strict';

var fs = require('fs');
var path = require('path');
var File = require('vinyl');
var matter = require('parser-front-matter');
var dry = require('..');

var options = {
  condense: true,
  trim: true,
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
    '  Default before',
    '  {% block "body" %}',
    '  Nothing yet.',
    '  {% endblock %}',
    '  Default after',
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

var file = new File({
  path: 'foo.html',
  contents: new Buffer([
    '---',
    'layout: base.html',
    '---',
    'This is {{title}}',
    '{% block "head" %}',
    '  <title>{{title}}</title>',
    '{% endblock %}',
    '{% block "footer" %}',
    '{% endblock %}',
  ].join('\n'))
});

file = matter.parseSync(file);
file.contents = new Buffer(file.content);
if (file.data.layout) {
  file.layout = file.data.layout;
}
// console.log(file.content)

var files = [def, file, base];
options.files = {
  'foo.html': file,
  'base.html': base,
  'default.html': def
};

files.forEach(function(file) {
  dry.parse(file, options);
});

var res = dry(file, options);
console.log(res.contents.toString());
