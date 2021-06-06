'use strict';

const assert = require('assert');
const { Token } = require('./nodes');
const { chars, regex } = require('./constants');
const { location, updateLocation } = require('./Location');

const {
  REGEX_BOM,
  REGEX_COMMENT_CLOSE,
  REGEX_COMMENT_OPEN,
  REGEX_DOTDOT,
  REGEX_ESCAPED,
  REGEX_IDENTIFIER,
  REGEX_LITERAL,
  REGEX_NUMBER,
  REGEX_OPERATOR,
  REGEX_PROPERTY,
  REGEX_SPACE,
  REGEX_TAG_CLOSE,
  REGEX_TAG_OPEN,
  REGEX_TEXT,
  REGEX_VARIABLE_CLOSE,
  REGEX_VARIABLE_OPEN
} = regex;

class Lexer {
  constructor(input, options) {
    this.options = { ...options };
    this.tokens = [];
    this.queue = [];
    this.source = Buffer.from(input);
    this.remaining = String(input);
    this.consumed = '';
    this.index = 0;
    this.inside = 0;
    this.loc = { index: 0, line: 1, col: 0 };
  }

  eos() {
    return this.remaining === '' && this.queue.length === 0;
  }

  enqueue(token) {
    if (token) this.queue.push(token);
    return token;
  }

  dequeue() {
    return this.queue.shift();
  }

  updateLocation(value, length) {
    updateLocation(this.loc, value, length);
  }

  consume(value, length) {
    if (!this.remaining) return;
    if (!value) value = this.remaining[0];
    if (!length) length = value.length;
    this.updateLocation(value, length);
    this.remaining = this.remaining.slice(length);
    this.consumed += value;
    return value;
  }

  match(regex) {
    assert(regex instanceof RegExp, 'Expected a regular expression');

    if (regex.validated !== true) {
      assert(regex.source[0] === '^', 'Expected regex to start with "^"');
      regex.validated = true;
    }

    const match = regex.exec(this.remaining);
    if (match && match[0] === '') {
      throw new SyntaxError('regex should not match an empty string');
    }
    return match;
  }

  scan(regex, type = 'text') {
    const match = this.match(regex);
    if (match) {
      return new Token({ type, value: match[0], match }, this.prev);
    }
  }

  capture(regex, type) {
    const token = this.scan(regex, type);
    if (token) {
      const pos = location(this.loc);
      this.consume(token.match[0]);
      return pos(token);
    }
  }

  captureBom() {
    if (this.index === 0) {
      this.captureBom = null;
      const token = this.capture(REGEX_BOM, 'bom');
      if (token) {
        this.index = 0; // reset index to 0, since capture advances the index
        return token;
      }
    }
  }

  captureEscaped() {
    const token = this.capture(REGEX_ESCAPED, 'text');
    if (token) {
      if (token.value.length % 2 === 1) token.value += this.consume();
      return token;
    }
  }

  captureExpression() {
    if (this.inside === 0) return false;

    const token = this.capture(REGEX_NUMBER, 'number')
      || this.capture(REGEX_OPERATOR, 'operator')
      || this.capture(REGEX_PROPERTY, 'property');

    if (token) {
      return token;
    }
  }

  captureLiteral() {
    const token = this.capture(REGEX_LITERAL, 'literal');

    if (token) {
      token.type = this.inside === 0 ? 'text' : 'literal';
      return token;
    }
  }

  captureDotDot() {
    if (this.inside === 0) return false;
    const token = this.capture(REGEX_DOTDOT, 'dotdot');
    if (token) {
      return token;
    }
  }

  captureSpace() {
    const token = this.capture(REGEX_SPACE, 'space');
    if (token) {
      return token;
    }
  }

  captureTag() {
    const token = this.capture(REGEX_TAG_OPEN, 'tag');
    // const token = this.capture(/^{%([-=]*)\s*((?:end)?\S+)\s*([\s\S]*?)\s*([-=]*)%}/, 'tag');

    if (token) {
      this.skipWhile(tok => {
        token.value += tok.value;
        return tok.type !== 'tag_close';
      });

      token.match = /^{%([-=]*)\s*((?:end)?\S+)\s*([\s\S]*?)\s*([-=]*)%}/.exec(token.value);
      token.name = token.match[2];
      this.next();
      return token;
    }
  }

  captureVariable() {
    // const token = this.capture(/^{{2,4}(.*?)}{2,4}/, 'variable');
    const token = this.capture(/^{{2,4}([!>^-]*)\s*(.*?)\s*([-]*)}{2,4}/, 'variable');
    if (token) {
      return token;
    }
  }

  captureText() {
    const regex = this.inside > 0 ? REGEX_IDENTIFIER : REGEX_TEXT;
    const token = this.capture(regex, 'text');

    if (token) {
      token.else = token.match[1] === 'els';
      token.end = token.match[1] === 'end';
      return token;
    }
  }

  captureOpen() {
    const token = this.capture(REGEX_VARIABLE_OPEN, 'variable_open')
      || this.capture(REGEX_COMMENT_OPEN, 'comment_open')
      || this.capture(REGEX_TAG_OPEN, 'tag_open');

    if (token) {
      this.inside++;
      return token;
    }
  }

  captureClose() {
    const token = this.capture(REGEX_VARIABLE_CLOSE, 'variable_close')
      || this.capture(REGEX_COMMENT_CLOSE, 'comment_close')
      || this.capture(REGEX_TAG_CLOSE, 'tag_close');

    if (token) {
      this.inside--;
      return token;
    }
  }

  createMatch(value) {
    const match = [value];
    match.index = 0;
    match.input = this.remaining;
    match.groups = undefined;
    return match;
  }

  captureChar() {
    const pos = location(this.loc);
    const value = this.consume();
    const match = this.createMatch(value);
    const type = chars[value] || 'text';
    return pos(new Token({ type, value, match }, this.prev));
  }

  advance() {
    return this.captureBom && this.captureBom()
      || this.captureEscaped()
      || this.capture(REGEX_TAG_CLOSE, 'tag_close')
      || this.captureTag()
      || this.captureVariable()
      || this.captureLiteral()
      || this.captureDotDot()
      || this.captureSpace()
      || this.captureText()
      || this.captureChar()
      || this.fail();
  }

  next() {
    return this.push(this.dequeue() || this.advance());
  }

  lookbehind(n = 1) {
    assert(Number.isInteger(n), 'Expected a positive integer');
    return this.tokens[this.tokens.length - n];
  }

  lookahead(n = 1) {
    let fetch = n - this.queue.length;
    while (fetch-- > 0 && this.remaining && this.enqueue(this.advance()));
    return this.queue[--n];
  }

  peek() {
    return this.lookahead(1);
  }

  skipWhile(fn = () => !this.eos()) {
    const skipped = [];
    let n = 0;
    while (fn(this.peek(), n++)) skipped.push(this.next());
    return skipped;
  }

  skipTo(type) {
    return this.skipWhile(tok => tok && tok.type !== type);
  }

  accept(type) {
    const token = this.peek();

    if (token && token.type === type) {
      return this.next();
    }
  }

  expect(type, message = token => `Expected "${type}", but received "${token.type}"`) {
    const token = this.peek();

    if (token && token.type !== type) {
      throw new SyntaxError(message(token));
    }

    return this.next();
  }

  push(token) {
    if (!token) return;
    this.tokens.push(token);
    this.prev = token;
    return token;
  }

  lex() {
    while (!this.eos()) this.next();
    return this.tokens;
  }

  fail() {
    throw new SyntaxError(`Unrecognized character: ${this.remaining[0]}`);
  }
}

module.exports = Lexer;
