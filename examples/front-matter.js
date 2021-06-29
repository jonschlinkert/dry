'use strict';

const Dry = require('..');

const source = `---
title: base.html
---
This is {{title}}.
`;

const template = Dry.Template.parse(source);
console.log(template.render());
