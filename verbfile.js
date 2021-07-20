'use strict';

module.exports = verb => {
  verb.use(require('verb-generate-readme'));
  verb.helper('wrap', input => `{% ${input} %}`);
  verb.task('default', ['readme']);
};
