
// const path = require('path');
const Dry = require('../../..');
const { FileSystem: { LocalFileSystem } } = Dry;
const file_system = new LocalFileSystem(__dirname, '_%s.html');

const source = `
{% from 'fields' import input as input_field, textarea %}

<p>{{ input_field('password', '', 'password') }}</p>
<p>{{ textarea('comment', 'This is a comment') }}</p>
`;

const template = Dry.Template.parse(source);
template.render({}, { registers: { file_system } })
  .then(console.log)
  .catch(console.error);

