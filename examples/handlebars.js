'use strict';

const fs = require('fs');
const path = require('path');
const File = require('vinyl');
const handlebars = require('handlebars');
const matter = require('parser-front-matter');
const Dry = require('..');

const options = {
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

const def = new File({
  path: 'default.html',
  contents: Buffer.from([
    '<!DOCTYPE html>',
    '<html lang="en">',
    '  Default before',
    '  {% block "body" %}',
    '  Nothing yet.',
    '  {% endblock %}',
    '  Default after',
    '</html>'
  ].join('\n'))
});

const base = new File({
  path: 'base.html',
  contents: Buffer.from([
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
    '  </body>'
  ].join('\n'))
});

const qux = new File({
  path: 'qux.html',
  contents: Buffer.from([
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
    '  </body>'
  ].join('\n'))
});

const file = new File({
  path: 'foo.html',
  contents: Buffer.from([
    '---',
    'title: Foo',
    'layout: qux.html',
    '---',
    'This is {{title}}',
    '{% block "head" %}',
    '  <title>{{title}}</title>',
    '{% endblock %}',
    '{% block "footer" %}',
    '{% endblock %}'
  ].join('\n'))
});

function parseMattter(file) {
  file = matter.parseSync(file);
  file.contents = Buffer.from(file.content);
  if (file.data.extends) file.extends = file.data.extends;
  if (file.data.layout) file.layout = file.data.layout;
}

const render = async file => {
  const res = await Dry.Template.render(file.contents, options);
  const fn = handlebars.compile(res);
  return fn(file.data);
};

const files = [def, file, base, qux];
options.files = {
  'foo.html': file,
  'base.html': base,
  'default.html': def,
  'qux.html': qux
};

files.forEach(function(file) {
  parseMattter(file);
  Dry.Template.parse(file, options);
});

render(file)
  .then(console.log)
  .catch(console.error);
