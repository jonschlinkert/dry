'use strict';

class Scanner {
  constructor(input) {
    this.input = input;
    this.remaining = this.input;
    this.consumed = '';
  }

  eos() {
    return !this.remaining;
  }

  getch() {
    return this.consume(1);
  }

  consume(n = 1) {
    const char = this.remaining[0];
    this.remaining = this.remaining.slice(1);
    this.consumed += char;
    return char;
  }

  scan(pattern) {
    const match = !this.eos() && pattern.exec(this.remaining);
    if (match) {
      const [value] = match;
      this.remaining = this.remaining.slice(value.length);
      this.consumed += value;
      return value;
    }
  }

  skip(regex) {
    return (this.scan(regex) || []).length;
  }
}

module.exports = Scanner;
