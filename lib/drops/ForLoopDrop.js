'use strict';

const Dry = require('../Dry');

const kIndex = Symbol(':index');
const kName = Symbol(':name');

class ForLoopDrop extends Dry.Drop {
  constructor(name, length = 0, parentloop, node) {
    super();
    Reflect.defineProperty(this, 'node', { value: node });
    this.name = name;
    this.length = length;
    if (parentloop) this.parent = this.parentloop = parentloop;
    this[kIndex] = 0;
  }

  get index() {
    return this[kIndex] + 1;
  }

  get index0() {
    return this[kIndex];
  }

  get rindex() {
    return this.length - this[kIndex];
  }

  get rindex0() {
    return this.length - this[kIndex] - 1;
  }

  get first() {
    return this[kIndex] === 0;
  }

  get last() {
    return this[kIndex] === this.length - 1;
  }

  set name(value) {
    this[kName] = value;
  }
  get name() {
    Dry.Usage.increment('forloop_drop_name');
    return this[kName];
  }

  increment() {
    this[kIndex]++;
  }

  static get kIndex() {
    return kIndex;
  }
}

module.exports = ForLoopDrop;

