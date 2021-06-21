'use strict';

const Dry = require('../Dry');
const Scanner = require('./Scanner');

const SPECIALS = Object.freeze({
  '|': 'pipe',
  '.': 'dot',
  ':': 'colon',
  ',': 'comma',
  '[': 'open_square',
  ']': 'close_square',
  '(': 'open_round',
  ')': 'close_round',
  '?': 'question',
  '-': 'dash'
});

const IDENTIFIER            = /^[a-zA-Z_][\w-]*\??/;
const SINGLE_STRING_LITERAL = /^'(\\.|[^']*)+'/;
const DOUBLE_STRING_LITERAL = /^"(\\.|[^"]*)+"/;
const NUMBER_LITERAL        = /^[-+]?\d+(\.\d+)?/;
const DOTDOT                = /^\.\./;
const COMPARISON_OPERATOR   = /^(?:<>|(?:==|!=|<=?|>=?)=?|[%^&*~+/-]|(contains)(?=\s))/;
// const COMPARISON_OPERATOR   = /^(?:<>|(?:==|!=|<=?|>=?)=?|[%^&*~+/-](?=\s*\w)|(contains)(?=\s))/;
const WHITESPACE            = /^\s+/;

class Lexer {
  constructor(input) {
    this.scanner = new Scanner(input);
  }

  tokenize() {
    this.output = [];
    let tok;
    let t;

    while (!this.scanner.eos()) {
      this.scanner.scan(WHITESPACE);
      if (this.scanner.eos()) break;

      if ((t = this.scanner.scan(COMPARISON_OPERATOR))) {
        tok = ['comparison', t];
      } else if ((t = this.scanner.scan(SINGLE_STRING_LITERAL))) {
        tok = ['string', t];
      } else if ((t = this.scanner.scan(DOUBLE_STRING_LITERAL))) {
        tok = ['string', t];
      } else if ((t = this.scanner.scan(NUMBER_LITERAL))) {
        tok = ['number', t];
      } else if ((t = this.scanner.scan(IDENTIFIER))) {
        tok = ['id', t];
      } else if ((t = this.scanner.scan(DOTDOT))) {
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
