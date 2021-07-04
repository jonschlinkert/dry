'use strict';

const Dry = require('../..');
Dry.Lexer = require('./Lexer');
Dry.Template.register_tag('frontmatter', require('./tags/FrontMatter'));

const source = `---
title: base.html
---
This is {{title}}.
`;

const template = Dry.Template.parse(source);
template.render().then(console.log);
