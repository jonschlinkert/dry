const start = Date.now();
const { Template } = require('..');

console.log('Elapsed:', Date.now() - start);

const template = new Template();
template.parse('Hello {{ name }}!');

console.log('Elapsed:', Date.now() - start);

template.render({ name: 'Unai' })
  .then(output => {
    console.log(output);
    console.log('Total:', Date.now() - start);
  });
