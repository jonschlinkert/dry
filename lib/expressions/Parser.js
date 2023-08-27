
const Dry = require('../Dry');
const Lexer = require('./Lexer');
const kTokens = Symbol('tokens');

class Parser {
  constructor(input, node) {
    this.lexer = new Lexer(input, node);
    this.node = node;
    this.p = 0;
  }

  eos() {
    return !this.tokens[this.p] || this.tokens[this.p][0] === 'end_of_string';
  }

  jump(point) {
    this.p = point;
  }

  consume(type = null) {
    const token = this.tokens[this.p];

    if (type && token[0] !== type) {
      const prev = this.tokens[this.p - 1];
      const next = this.tokens[this.p + 1];
      throw new Dry.SyntaxError(`Expected ${prev[0]} but found ${next[0]}`);
    }

    this.p++;
    return token[1];
  }

  // Only consumes the token if it matches the type
  // Returns the token's contents if it was consumed
  // or false otherwise.
  accept(type, value) {
    const token = this.tokens[this.p];
    if (!(token && token[0] === type)) return false;
    if (value && token[1] !== value) return false;
    this.p++;
    return token[1];
  }

  id(value) {
    const token = this.tokens[this.p];
    if (!(token && token[1] === value)) return false;
    this.p++;
    return token[1];
  }

  look(type, ahead = 0) {
    const tok = this.tokens[this.p + ahead];
    return tok ? tok[0] === type : false;
  }

  peek() {
    return this.tokens[this.p + 1];
  }

  expression() {
    const token = this.tokens[this.p];
    let first, last;
    let s = '';

    switch (token[0]) {
      case 'id':
      case 'this':
        s = this.consume();
        s += this.variable_lookups();
        return s;

      case 'spread':
        s = this.consume();
        return s;

      case 'open_square':
        s = this.consume();
        s += this.expression();
        s += this.consume('close_square');
        s += this.variable_lookups();
        return s;

      case 'open_brace':
        s = this.consume();
        s += this.expression();
        s += this.consume('colon');
        s += this.expression();
        s += this.consume('close_brace');
        s += this.variable_lookups();
        return s;

      case 'literal':
      case 'number':
      case 'string':
        return this.consume();

      case 'colon':
        this.consume();
        return this.expression();

      case 'close_round':
        this.consume();
        return '';

      case 'open_round':
        this.consume();

        if (this.tokens.slice(this.p).some(t => t[0] === 'dotdot')) {
          first = this.expression();
          this.consume('dotdot');
          last = this.expression();
          this.consume('close_round');
          return `(${first}..${last})`;
        }

        if (this.accept('close_round')) {
          return '';
        }

        while (this.tokens[this.p]?.[0] !== 'close_round') {
          s += this.expression();
          s += this.accept('comma') || '';
          s += this.accept('pipe') || '';
        }

        this.consume('close_round');
        return s;
      default: {
        throw new Dry.SyntaxError(`"${token[1]}" is not a valid expression`);
      }
    }
  }

  argument() {
    let s = '';

    // might be a keyword argument (identifier: expression)
    if (this.look('id') && this.look('colon', 1)) {
      s += this.consume() + this.consume() + ' ';
    }

    s += this.expression();
    return s;
  }

  variable_lookups() {
    let s = '';

    while (!this.eos()) {
      if (this.look('open_square')) {
        s += this.consume();
        s += this.expression();
        s += this.consume('close_square');
      } else if (this.look('dot')) {
        s += this.consume();
        s += this.consume('id');
      } else {
        break;
      }
    }

    return s;
  }

  get tokens() {
    this[kTokens] ||= this.lexer.tokenize();
    return this[kTokens];
  }
}

module.exports = Parser;
