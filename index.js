'use strict';

var debug = require('debug')('dry');
var compile = require('./lib/compile');
var parser = require('./lib/parser');
var utils = require('./lib/utils');

/**
 * Render
 */

function render(file, options) {
  debug('rendering <%s>', file.path);
  var opts = utils.extend({}, options);
  compile(file, opts);
  file.fn(opts.locals);
  return file;
}

/**
 * Expose API
 */

module.exports = render;
module.exports.parse = parser;
module.exports.render = render;
module.exports.compile = compile;
