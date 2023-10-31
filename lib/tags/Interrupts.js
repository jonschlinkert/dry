
// An interrupt is any command that breaks processing of a block (ex: a for loop).
class Interrupt {
  constructor(message = null) {
    this.message = message || 'interrupt';
  }

  static get BreakInterrupt() {
    return BreakInterrupt;
  }

  static get ContinueInterrupt() {
    return ContinueInterrupt;
  }
}

// Interrupt that is thrown whenever a {% break %} is called.
class BreakInterrupt extends Interrupt {}

// Interrupt that is thrown whenever a {% continue %} is called.
class ContinueInterrupt extends Interrupt {}

module.exports = Interrupt;
