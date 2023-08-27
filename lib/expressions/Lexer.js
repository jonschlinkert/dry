
const Dry = require('../Dry');
const Scanner = require('./Scanner');

const REPLACEMENTS = Object.freeze({ and: '&&', or: '||', is: '===', isnt: '!==' });
const SPECIALS = Object.freeze({
  '|': 'pipe',
  '.': 'dot',
  ':': 'colon',
  ',': 'comma',
  '=': 'equal',
  '[': 'open_square',
  ']': 'close_square',
  '{': 'open_brace',
  '}': 'close_brace',
  '(': 'open_round',
  ')': 'close_round',
  '?': 'question',
  '-': 'dash'
});

const IDENTIFIER = /^(!*)(\.{2}\/)*[a-zA-Z_][\w-]*\??/;
const STRING_LITERAL = /^(?:`(\\.|[^`])*`|"(\\.|[^"])*"|'(\\.|[^'])*')/;
const NUMBER_LITERAL = /^[-+]?[0-9]+(\.[0-9]+)?/;
const SPREAD = /^\.{3}[a-zA-Z_][\w-]*/;
const DOTDOT = /^\.\./;
const WHITESPACE = /^\s+/;
const MATH_OPERATOR = /^[%^&*~+/-]+/;
const COMPARISON_OPERATOR = /^(?:<>|(?:==|!=)=?|[<>]=?|\?\?|\|\||&&|contains(?!\w))/;
const THIS_EXPRESSION = /^\s*(this|\.)\s*$/;

class Lexer {
  constructor(input, node) {
    this.scanner = new Scanner(input);
    this.node = node;
  }

  eos() {
    return !this.scanner.remaining;
  }

  scan(regex) {
    return this.scanner.scan(regex);
  }

  tokenize() {
    this.output = [];
    let tok;
    let t;

    while (!this.eos()) {
      if ((t = this.scan(THIS_EXPRESSION))) {
        this.output.push(['this', 'this']);
        continue;
      }

      this.scan(WHITESPACE);
      if (this.eos()) break;

      if ((t = this.scan(COMPARISON_OPERATOR))) {
        tok = ['comparison', REPLACEMENTS[t] || t];
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
      } else if ((t = this.scan(MATH_OPERATOR))) {
        tok = ['operator', t];
      } else {
        const c = this.scanner.consume(1);
        const s = SPECIALS[c];

        if (s) {
          tok = [s, c];
        } else {
          const v = this.node?.value || this.scanner.input;
          throw new Dry.SyntaxError(`Unexpected character ${c} in "${v}"`);
        }
      }

      this.output.push(tok);
    }

    this.output.push(['end_of_string']);
    return this.output;
  }
}

module.exports = Lexer;
