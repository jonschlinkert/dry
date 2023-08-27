
class Scanner {
  constructor(input) {
    this.input = input;
    this.remaining = this.input;
    this.consumed = '';
  }

  consume(n = 1) {
    const char = this.remaining[0];
    this.remaining = this.remaining.slice(1);
    this.consumed += char;
    return char;
  }

  scan(pattern) {
    const match = this.remaining && pattern.exec(this.remaining);
    if (match) {
      const value = match[0];
      this.remaining = this.remaining.slice(value.length);
      this.consumed += value;
      return value;
    }
  }
}

module.exports = Scanner;
