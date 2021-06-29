'use strict';

const File = require('vinyl');
const utils = require('../lib/utils');
const dry = require('..');

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

const file = new File({
  path: 'foo.html',
  contents: Buffer.from([
    '{% layout "base.html" %}',
    'This is foo',
    '{% block "footer" %}',
    '{% endblock %}'
  ].join('\n'))
});

const res = dry(file, {
  files: {
    'default.html': def,
    'base.html': base
  }
});

console.log(res);

