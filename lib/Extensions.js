'use strict';

class Extensions {
  constructor() {
    this.cache = {};
  }

  set(name, key, value) {
    this.cache[name] ||= {};
    this.cache[name][key] = value;
    return this;
  }

  get(name, key) {
    this.cache[name] ||= {};
    return this.cache[name][key];
  }

  has(name, key) {
    this.cache[name] ||= {};
    return this.cache[name][key] !== undefined;
  }
}

module.exports = Extensions;
