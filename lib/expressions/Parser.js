'use strict';

const Dry = require('../Dry');
const Lexer = require('./Lexer');

class Parser {
  constructor(input) {
    const lexer = new Lexer(input);
    this.tokens = lexer.tokenize();
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
      throw new Dry.SyntaxError(`Expected ${type} but found ${this.tokens[this.p][0]}`);
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

  expression() {
    const token = this.tokens[this.p];
    let s, first, last;

    switch (token[0]) {
      case 'id':
        s = this.consume();
        s += this.variable_lookups();
        return s;

      case 'open_square':
        s = this.consume();
        s += this.expression();
        s += this.consume('close_square');
        s += this.variable_lookups();
        return s;

      case 'literal':
      case 'number':
      case 'string':
        return this.consume();

      case 'open_round':
        this.consume();
        first = this.expression();
        this.consume('dotdot');
        last = this.expression();
        this.consume('close_round');
        return `(${first}..${last})`;

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
}

module.exports = Parser;
