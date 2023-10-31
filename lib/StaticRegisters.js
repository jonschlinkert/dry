
const { hasOwnProperty } = Reflect;
const Dry = require('./Dry');
const { handlers } = require('./shared/utils');

class StaticRegisters {
  constructor(registers = {}) {
    this.static = registers.static || registers;
    this.registers = {};
    return new Proxy(this, handlers);
  }

  set(key, value) {
    return (this.registers[key] = value);
  }

  get(key) {
    return hasOwnProperty.call(this.registers, key) ? this.registers[key] : this.static[key];
  }

  delete(key) {
    const value = this.registers[key];
    delete this.registers[key];
    return value;
  }

  fetch(key, fallback, block) {
    if (hasOwnProperty.call(this.registers, key)) return this.registers[key];
    if (hasOwnProperty.call(this.static, key)) return this.static[key];
    if (fallback === undefined) { throw new Dry.KeyError(key); }
    if (block) return typeof block === 'function' ? block.call(this, key, fallback) : block;
    return fallback;
  }

  key(key) {
    return hasOwnProperty.call(this.registers, key) || hasOwnProperty.call(this.static, key);
  }
}

module.exports = StaticRegisters;
