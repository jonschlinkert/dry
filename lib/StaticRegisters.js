'use strict';

const Dry = require('./Dry');

class StaticRegisters {
  constructor(registers = {}) {
    this.static = registers instanceof StaticRegisters ? registers.static : registers;
    this.registers = {};
    return new Proxy(this, Dry.utils.handlers);
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
