'use strict';

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
const COMPARISON_OPERATOR   = /^(?:<>|(?:==|!=|<=?|>=?)=?|contains(?=\s))/;
const WHITESPACE            = /^\s+/;

class Lexer {
  constructor(input) {
    this.scanner = new Scanner(input);
  }

  tokenize() {
    this.output = [];
    // let prev;
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
          throw new SyntaxError(`Unexpected character ${c}`);
        }
      }

      // if (prev && prev[0] === 'id' && tok[0] === 'id') {
      //   prev[1] += spaces + tok[1];
      //   continue;
      // }

      // if (prev && (prev[0] === 'id' || prev[0] === 'string') && tok[0] === 'string') {
      //   prev[0] = 'string';
      //   prev[1] += spaces + tok[1];
      //   continue;
      // }

      this.output.push(tok);
      // prev = tok;
    }

    this.output.push(['end_of_string']);
    return this.output;
  }
}

module.exports = Lexer;
