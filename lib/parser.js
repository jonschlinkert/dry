'use strict';

var debug = require('debug')('dry');
var Lexer = require('./lexer');
var utils = require('./utils');

function Parser(file, options) {
  this.options = options || {};

  this.file = utils.normalize(file);
  this.lexer = new Lexer(this.file, this.options);
  this.input = file.contents.toString();
  this.parsers = {};
  this.blocks = {};
  this.contexts = [this];
}

Parser.prototype = {
  parser: function(type, fn) {
    this.parsers[type] = fn;
    return this;
  },

  /**
   * Push `parser` onto the context stack,
   * or pop and return a `Parser`.
   */

  context: function(parser){
    if (parser) {
      this.contexts.push(parser);
    } else {
      return this.contexts.pop();
    }
  },

  /**
   * Return the next token object.
   *
   * @return {Object}
   * @api private
   */

  advance: function(){
    return this.lexer.advance();
  },

  /**
   * Skip `n` tokens.
   *
   * @param {Number} n
   * @api private
   */

  skip: function(n){
    while (n--) this.advance();
  },

  /**
   * Single token lookahead.
   *
   * @return {Object}
   * @api private
   */

  peek: function() {
    return this.lookahead(1);
  },

  /**
   * Return lexer lineno.
   *
   * @return {Number}
   * @api private
   */

  line: function() {
    return this.lexer.lineno;
  },

  /**
   * `n` token lookahead.
   *
   * @param {Number} n
   * @return {Object}
   * @api private
   */

  lookahead: function(n){
    return this.lexer.lookahead(n);
  },

  /**
   * Parse input returning a string of js for evaluation.
   *
   * @return {String}
   * @api public
   */

  parse: function() {
    debug('parsing', this.file.path);
    return this.lexer.tokenize();
  }
};

module.exports = Parser;
