'use strict';

const { defineProperty } = Reflect;
const { kToken } = require('../constants/symbols');

class Token {
  constructor(token, prev = token.prev) {
    this.type = token.type;
    this.value = token.value;
    defineProperty(this, kToken, { value: token, writable: true });
    defineProperty(this, 'match', { value: token.match, writable: true });
    defineProperty(this, 'prev', { value: token.prev, writable: true });
    defineProperty(this, 'loc', { value: token.loc, writable: true });
  }
}

module.exports = Token;
