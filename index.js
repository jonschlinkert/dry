'use strict';

var debug = require('debug')('dry');
var compile = require('./lib/compile');
var parser = require('./lib/parser');
var utils = require('./lib/utils');

/**
 * Render
 */

function render(file, locals) {
  debug('rendering <%s>', file.path);
  compile(file, locals);
  file.fn(locals);
  return file;
}

/**
 * Expose API
 */

module.exports = render;
module.exports.parse = parser;
module.exports.render = render;
module.exports.compile = compile;
