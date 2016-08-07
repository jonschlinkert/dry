'use strict';

var fs = require('fs');
var path = require('path');
var File = require('vinyl');
var handlebars = require('handlebars');
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
    '---',
    'title: BASE',
    '---',
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

var qux = new File({
  path: 'qux.html',
  contents: new Buffer([
    '---',
    'title: QUX',
    '---',
    '{% layout "default.html" %}',
    '  {% block "head" %}',
    '  <head>',
    '    <meta charset="UTF-8">',
    '    <title>QUX LAYOUT</title>',
    '  </head>',
    '  {% endblock %}',
    '  <body>',
    '    {{title}} before',
    '    {% block "body" %}',
    '    {% endblock %}',
    '    {{title}} after',
    '  </body>',
  ].join('\n'))
});

var file = new File({
  path: 'foo.html',
  contents: new Buffer([
    '---',
    'title: Foo',
    'layout: qux.html',
    '---',
    'This is {{title}}',
    '{% block "head" %}',
    '  <title>{{title}}</title>',
    '{% endblock %}',
    '{% block "footer" %}',
    '{% endblock %}',
  ].join('\n'))
});

function parseMattter(file) {
  file = matter.parseSync(file);
  file.contents = new Buffer(file.content);
  if (file.data.extends) file.extends = file.data.extends;
  if (file.data.layout) file.layout = file.data.layout;
}

function render(file) {
  var res = dry(file, options);
  var str = res.contents.toString();
  var fn = handlebars.compile(str);
  return fn(file.data);
}

var files = [def, file, base, qux];
options.files = {
  'foo.html': file,
  'base.html': base,
  'default.html': def,
  'qux.html': qux,
};

files.forEach(function(file) {
  parseMattter(file);
  dry.parse(file, options);
});

console.log(render(file));
