'use strict';

// const path = require('path');
const Dry = require('../../..');
const { FileSystem: { LocalFileSystem } } = Dry;
const file_system = new LocalFileSystem(__dirname);

const source = `
{% import "signup" as forms %}

The above import call imports the forms.html file (which can contain only macros, or a template and some macros), and import the macros as items of the forms local variable.

The macros can then be called at will in the current template:

<p>{{ forms.input('username') }}</p>
<p>{{ forms.input('password', null, 'password') }}</p>

<hr>

<p>{{ forms.textarea('bio') }}</p>
`;

const template = Dry.Template.parse(source);
console.log(template.render({}, { registers: { file_system } }));
