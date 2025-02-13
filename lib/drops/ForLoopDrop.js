const Dry = require('../Dry');

const kIndex = Symbol(':index');
const kLocked = Symbol(':locked');
const kName = Symbol(':name');
const kVersion = Symbol(':version');

const MAX_SAFE_INDEX = Number.MAX_SAFE_INTEGER - 1;

class ForLoopDrop extends Dry.Drop {
  constructor(name, length = 0, parentloop) {
    super();
    this.name = name;
    this.length = Math.min(length, MAX_SAFE_INDEX);
    this[kIndex] = 0;
    this[kLocked] = false;
    this[kVersion] = 0;

    if (parentloop) {
      this.parentloop = parentloop;
    }
  }

  get index() {
    this.checkModification();
    return Math.min(this[kIndex] + 1, MAX_SAFE_INDEX);
  }

  get index0() {
    this.checkModification();
    return Math.min(this[kIndex], MAX_SAFE_INDEX);
  }

  get rindex() {
    this.checkModification();
    return Math.max(0, Math.min(this.length - this[kIndex], MAX_SAFE_INDEX));
  }

  get rindex0() {
    this.checkModification();
    return Math.max(0, Math.min(this.length - this[kIndex] - 1, MAX_SAFE_INDEX));
  }

  get first() {
    this.checkModification();
    return this[kIndex] === 0;
  }

  get last() {
    this.checkModification();
    return this[kIndex] === this.length - 1;
  }

  set name(value) {
    this[kName] = value;
  }

  get name() {
    Dry.Usage.increment('forloop_drop_name');
    return this[kName];
  }

  get parent() {
    return this.parentLoop;
  }

  increment() {
    if (this[kLocked]) {
      throw new Dry.Error('Cannot modify ForLoopDrop while iterating');
    }

    if (this[kIndex] < MAX_SAFE_INDEX) {
      this[kLocked] = true;
      try {
        this[kIndex]++;
        this[kVersion]++;
      } finally {
        this[kLocked] = false;
      }
    }
  }

  checkModification() {
    if (this[kLocked]) {
      throw new Dry.Error('Cannot read ForLoopDrop while being modified');
    }
  }

  static get kIndex() {
    return kIndex;
  }
}

module.exports = ForLoopDrop;
