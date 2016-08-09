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
  dry.parse(file, opts);
  dry.compile(file, opts);
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

dry.compile = function(file, options) {
  var compiler = new Compiler(file, options);
  var str = compiler.compile(file.ast, options);
  file.contents = new Buffer(str);
  return file;
};

module.exports = dry;

