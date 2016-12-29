'use strict';

module.exports = function(verb) {
  verb.use(require('verb-generate-readme'));
  verb.helper('wrap', function(str) {
    return '{% ' + str + ' %}';
  });
  verb.task('default', ['readme']);
};
