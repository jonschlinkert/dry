'use strict';

const Dry = require('../Dry');
const Scanner = require('./Scanner');

const SPECIALS = Object.freeze({
  '|': 'pipe',
  '.': 'dot',
  ':': 'colon',
  ',': 'comma',
  '=': 'equal',
  '[': 'open_square',
  ']': 'close_square',
  '(': 'open_round',
  ')': 'close_round',
  '?': 'question',
  '-': 'dash'
});

const IDENTIFIER          = /^[a-zA-Z_][\w-]*\??/;
const STRING_LITERAL      = /^(?:`(\\.|[^`])*`|"(\\.|[^"])*"|'(\\.|[^'])*')/;
const NUMBER_LITERAL      = /^[-+]?\d+(\.\d+)?/;
const SPREAD              = /^\.{3}[a-zA-Z_][\w-]*/;
const DOTDOT              = /^\.\./;
const WHITESPACE          = /^\s+/;
const COMPARISON_OPERATOR = /^(?:<>|(?:==|!=|<=?|>=?)=?|[%^&*~+/-]|(contains)(?=\s))/;

class Lexer {
  constructor(input) {
    this.scanner = new Scanner(input);
  }

  scan(regex) {
    return this.scanner.scan(regex);
  }

  tokenize() {
    this.output = [];
    let tok;
    let t;

    while (!this.scanner.eos()) {
      this.scan(WHITESPACE);
      if (this.scanner.eos()) break;

      if ((t = this.scan(COMPARISON_OPERATOR))) {
        tok = ['comparison', t];
      } else if ((t = this.scan(STRING_LITERAL))) {
        tok = ['string', t];
      } else if ((t = this.scan(NUMBER_LITERAL))) {
        tok = ['number', t];
      } else if ((t = this.scan(IDENTIFIER))) {
        tok = ['id', t];
      } else if ((t = this.scan(SPREAD))) {
        tok = ['spread', t];
      } else if ((t = this.scan(DOTDOT))) {
        tok = ['dotdot', t];
      } else {
        const c = this.scanner.getch();
        const s = SPECIALS[c];
        if (s) {
          tok = [s, c];
        } else {
          throw new Dry.SyntaxError(`Unexpected character ${c}`);
        }
      }

      this.output.push(tok);
    }

    this.output.push(['end_of_string']);
    return this.output;
  }
}

module.exports = Lexer;
