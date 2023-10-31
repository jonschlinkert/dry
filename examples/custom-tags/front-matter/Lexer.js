
const Dry = require('../..');

class Lexer extends Dry.Lexer {
  captureFence() {
    if (this.prev && this.prev.value !== '\n') return;
    const token = this.capture(/^---\n?/, 'fence');
    if (token && (token.value === '---\n' || this.remaining === '')) {
      return token;
    }
  }

  advance() {
    return this.captureFence() || super.advance();
  }
}

module.exports = Lexer;
