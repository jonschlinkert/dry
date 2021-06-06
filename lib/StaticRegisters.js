'use strict';

class StaticRegisters {
  constructor(registers = new Map()) {
    this.static = registers instanceof StaticRegisters ? registers.static : registers;
    this.registers = new Map();
  }

  set(key, value) {
    this.registers[key] = value;
    return value;
  }

  get(key) {
    return this.registers.has(key) ? this.registers.get(key) : this.static.get(key);
  }

  delete(key) {
    this.registers.delete(key);
    return true;
  }

  fetch(key, fallback = null, block = v => v) {
    const value = this.registers.has(key) ? this.registers.get(key) : this.static.get(key);
    const result = value != null ? value : fallback;
    return block(result);
  }

  has(key) {
    return this.registers.has(key) || this.static.has(key);
  }
}

module.exports = StaticRegisters;
