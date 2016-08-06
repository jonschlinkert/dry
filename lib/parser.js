'use strict';

var debug = require('debug')('dry');
var Lexer = require('./lexer');
var utils = require('./utils');

module.exports = function parse(file, options) {
  debug('parsing <%s>', file.path);
  var lexer = new Lexer(file, options);
  return lexer.tokenize();
};
