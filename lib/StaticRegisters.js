'use strict';

class StaticRegisters {
  constructor(registers = {}) {
    this.static = registers instanceof StaticRegisters ? registers.static : registers;
    this.registers = {};

    return new Proxy(this, {
      set(target, key, value) {
        if (key in target) {
          target[key] = value;
        } else {
          target.set(key, value);
        }
        return value;
      },
      get(target, key, receiver) {
        return key in target ? target[key] : target.get(key);
      }
    });
  }

  set(key, value) {
    this.registers[key] = value;
    return value;
  }

  get(key) {
    return key in this.registers ? this.registers[key] : this.static[key];
  }

  delete(key) {
    delete this.registers[key];
    return true;
  }

  fetch(key, fallback = null, block = v => v) {
    return block(this.has(key) ? this.get(key) : fallback);
  }

  has(key) {
    return key in this.registers || key in this.static;
  }
}

module.exports = StaticRegisters;
