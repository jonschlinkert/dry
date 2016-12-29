'use strict';

require('mocha');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var Lexer = require('../lib/lexer');

var fixtures = path.join.bind(path, __dirname, 'fixtures');

function read(filepath) {
  return fs.readFileSync(filepath);
}
function fixture(filepath) {
  return read(fixtures(filepath));
}

describe('lexer', function() {
  describe.skip('whitespace', function() {
    it('should capture indentation', function() {
      var str = fixture('block-indent.html');
      var lexer = new Lexer({path: 'string', contents: str});
      var tok = lexer.tokenize();
      console.log(tok);
    });

    it('should capture significant whitespace', function() {
      var str = fixture('layout-text-node.html');
      var lexer = new Lexer({path: 'string', contents: str});
      var tok = lexer.tokenize();
      console.log(tok);
    });
  });

  describe.skip('variables', function() {
    it('should capture es6 variables', function() {
      var lexer = new Lexer({path: 'string', contents: '   foo ${bar} baz'});
      var tok = lexer.tokenize();
      console.log(tok);
    });

    it('should capture mustache variables with whitespace', function() {
      var lexer = new Lexer({path: 'string', contents: 'foo ${bar} baz {{ qux }}'});
      var tok = lexer.tokenize();
      console.log(tok);
    });

    it('should capture mustache variables without whitespace', function() {
      var lexer = new Lexer({path: 'string', contents: 'foo ${bar} baz {{qux}}'});
      var tok = lexer.tokenize();
      console.log(tok);
    });

    it('should capture mustache variables without more than two mustaches', function() {
      var lexer = new Lexer({path: 'string', contents: 'foo ${bar} baz {{{{qux}}}}'});
      var tok = lexer.tokenize();
      console.log(tok);

      var lexer = new Lexer({path: 'string', contents: 'foo ${bar} baz {{{qux}}}'});
      var tok = lexer.tokenize();
      console.log(tok);
    });
  });
});
