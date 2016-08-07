'use strict';

var debug = require('debug')('dry');
var Compiler = require('./lib/compiler');
var Parser = require('./lib/parser');
var utils = require('./lib/utils');

/**
 * Render
 */

function dry(file, options) {
  debug('rendering <%s>', file.path);
  var opts = utils.extend({}, options);
  var compiler = new Compiler(file, opts);
  var parser = new Parser(opts);
  parser.parse(file);
  compiler.compile(file.ast);
  file.fn(opts.locals);
  return file;
}

/**
 * Expose API
 */

dry.Parser = Parser;
dry.Compiler = Compiler;
dry.render = dry;

dry.parse = function(file, options) {
  var parser = new Parser(options);
  return parser.parse(file);
};

module.exports = dry;

