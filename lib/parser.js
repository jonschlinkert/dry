'use strict';

var debug = require('debug')('dry');
var Lexer = require('./lexer');

function Parser(options) {
  this.options = options || {};
  this.lexer = new Lexer(this.options);
  this.parsers = {};
}

Parser.prototype.parser = function(type, fn) {
  this.parsers[type] = fn;
  return this;
};

Parser.prototype.parse = function(file) {
  debug('parsing', file.path);
  return this.lexer.tokenize(file);
};

module.exports = Parser;
