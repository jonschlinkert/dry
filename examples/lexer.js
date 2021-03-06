'use strict';

var File = require('vinyl');
var utils = require('../lib/utils');
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
    '{% endblock %}',
    'Default after',
    '</html>'
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
    '  </body>'
  ].join('\n'))
});

var file = new File({
  path: 'foo.html',
  contents: new Buffer([
    '{% layout "base.html" %}',
    'This is foo',
    '{% block "footer" %}',
    '{% endblock %}'
  ].join('\n'))
});

var res = dry(file, {
  files: {
    'default.html': def,
    'base.html': base,
  }
});

console.log(res)

