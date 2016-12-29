'use strict';

require('mocha');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var File = require('vinyl');
var Lexer = require('../lib/lexer');
var Compiler = require('../lib/compiler');

var fixtures = path.join.bind(path, __dirname, 'fixtures');

function read(filepath) {
  return fs.readFileSync(filepath);
}
function fixture(filepath) {
  return read(fixtures(filepath));
}

describe.skip('compiler', function() {
  describe('whitespace', function() {
    it('should respect indentation', function() {
      var str = fixture('block-indent.html');
      var file = new File({path: 'string', contents: new Buffer(str)});
      var compiler = new Compiler(file);
      var lexer = new Lexer(file);
      var tok = lexer.tokenize();
      var str = compiler.compile(tok);
      // console.log(tok);
    });

    it('should capture significant whitespace', function() {
      var str = fixture('layout-text-node.html');
      var lexer = new Lexer({path: 'string', contents: str});
      var tok = lexer.tokenize();
      // console.log(tok)
    });
  });
});
