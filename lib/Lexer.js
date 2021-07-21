'use strict';

const Dry = require('./Dry');
const Location = require('./Location');
const { characters } = Dry.constants;

const REGEX_BOM         = /^\ufeff/;
const REGEX_COMMENT_TAG = /^{#-?\s*((end)?comment)\s*-?#}/;
const REGEX_ESCAPED     = /^\\+/;
const REGEX_LITERAL     = /^(['"`])((?:\\.|(?!\1)[\s\S])*?)(\1)/;
const REGEX_RAW_TAG     = /^({%([=-]*)\s*raw\s*([=-]*)%})([\s\S]*?)({%([=-]*)\s*endraw\s*([=-]*)%})/;
const REGEX_SPACE       = /^\s+/;
const REGEX_TAG         = /^{%([-=]*)\s*((?:end)?\S+)\s*([\s\S]*?)\s*([-=]*)%}/;
const REGEX_TAG_CLOSE   = /^([=-]*)%}/;
const REGEX_TAG_OPEN    = /^{%([=-]*)/;
const REGEX_TEXT        = /^([^\s{}%]+|[{}])/;
const REGEX_VARIABLE    = /^{{(?!{)(-*)([^}]*?)(-*)}}/;

class Lexer {
  constructor(input, options) {
    this.options = { ...options };
    this.tokens = [];
    this.queue = [];
    this.source = Buffer.from(input);
    this.remaining = String(input);
    this.consumed = '';
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
    Location.updateLocation(this.loc, value, length);
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
    if (!(regex instanceof RegExp)) throw new Dry.TypeError('Expected a regular expression');

    if (regex.validated !== true) {
      if (regex.source[0] !== '^') throw new Dry.SyntaxError('Expected regex to start with "^"');
      regex.validated = true;
    }

    const match = regex.exec(this.remaining);
    if (match && match[0] === '') {
      throw new Dry.SyntaxError('regex should not match an empty string');
    }
    return match;
  }

  scan(regex, type = 'text') {
    const match = this.match(regex);
    if (match) {
      return new Dry.Token({ type, value: match[0], match }, this.prev);
    }
  }

  lookbehind(n = 1) {
    if (!Number.isInteger(n)) throw new Dry.TypeError('Expected a positive integer');
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

  accept(type) {
    const token = this.peek();

    if (token && token.type === type) {
      return this.dequeue();
    }
  }

  expect(type, message = token => `Expected "${type}", but received "${token.type}"`) {
    const token = this.peek();

    if (token && token.type !== type) {
      throw new Dry.SyntaxError(message(token));
    }

    return this.dequeue() || this.advance();
  }

  /**
   * Capture token `type` with given `regex`.
   */
  capture(regex, type) {
    const token = this.scan(regex, type);
    if (token) {
      const pos = Location.location(this.loc);
      this.consume(token.match[0]);
      return pos(token);
    }
  }

  /**
   * Capture a byte-order-mark. This only runs on the first character.
   */
  captureBom() {
    if (this.loc.index === 0) {
      const token = this.capture(REGEX_BOM, 'bom');
      if (token) {
        // reset index to 0, since capture advances the index and
        // we need to ensure that other scanners do not receive
        // false-negatives when checking if index is 0.
        this.loc.index = 0;
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

  captureLiteral() {
    if (this.inside === 0) return;
    const token = this.capture(REGEX_LITERAL, 'literal');
    if (token) {
      token.type = this.inside === 0 ? 'text' : 'literal';
      return token;
    }
  }

  /**
   * Raw
   */
  captureRawTag() {
    const token = this.capture(REGEX_RAW_TAG, 'raw');
    if (token) {
      token.tag_name = token.name = 'raw';
      return token;
    }
  }

  /**
   * Comment
   */
  captureCommentTag() {
    return this.capture(REGEX_COMMENT_TAG, 'comment');
  }

  /**
   * Tag
   */
  captureTag() {
    const token = this.capture(REGEX_TAG_OPEN, 'tag');

    if (token) {
      this.inside++;
      token.args = [];

      while (!this.eos()) {
        const t = this.next();
        if (!t) break;

        token.value += t.value;
        token.loc.end = t.loc.end;

        if (t.type === 'literal' || t.type === 'text') {
          if (!token.name) {
            token.name = token.tag_name = t.value;
          } else {
            token.args.push(t.value);
          }
        }

        if (t.type === 'tag_close') {
          break;
        }
      }

      token.match = REGEX_TAG.exec(token.value);
      token.name = token.match && token.match[2];
      return token;
    }
  }

  /**
   * Text
   */
  captureText() {
    return this.capture(REGEX_TEXT, 'text');
  }

  captureTagClose() {
    const token = this.capture(REGEX_TAG_CLOSE, 'tag_close');
    if (token) {
      if (this.inside === 0) {
        token.type = 'text';
      } else {
        this.inside--;
      }
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
    const pos = Location.location(this.loc);
    const value = this.consume();
    const match = this.createMatch(value);
    const type = characters[value] || 'text';
    return pos(new Dry.Token({ type, value, match }, this.prev));
  }

  advance() {
    return this.loc.index === 0 && this.captureBom()
      || this.captureEscaped()
      || this.capture(REGEX_SPACE, 'space')
      || this.captureLiteral()
      || this.captureCommentTag()
      || this.captureRawTag()
      || this.captureTag()
      || this.captureTagClose()
      || this.capture(REGEX_VARIABLE, 'variable')
      || this.captureText()
      || this.fail();
  }

  next() {
    return this.dequeue() || this.advance();
  }

  push(token) {
    if (!token) return;
    this.tokens.push(token);
    this.prev = token;
    return token;
  }

  lex() {
    while (!this.eos()) this.push(this.next());
    return this.tokens;
  }

  fail() {
    throw new Dry.SyntaxError(`Unrecognized character: ${this.remaining[0]}`);
  }

  static lex(input, options) {
    return new Lexer(input, options).lex();
  }
}

module.exports = Lexer;
