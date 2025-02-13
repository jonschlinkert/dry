const Dry = require('../Dry');
const Drop = require('./Drop');

const kIndex = Symbol('index');
const kLocked = Symbol('locked');
const kVersion = Symbol('version');

const MAX_SAFE_INDEX = Number.MAX_SAFE_INTEGER - 1;

class TablerowloopDrop extends Drop {
  constructor(length, cols) {
    super();
    this.length = Math.min(length, MAX_SAFE_INDEX);
    this.row = 1;
    this.col = 1;
    this.cols = Math.max(1, Math.min(cols, MAX_SAFE_INDEX));
    this[kIndex] = 0;
    this[kLocked] = false;
    this[kVersion] = 0;
  }

  set index(index) {
    this.checkModification();
    this[kIndex] = Math.min(index, MAX_SAFE_INDEX);
    this.recalculatePosition();
  }

  get index() {
    this.checkModification();
    return Math.min(this[kIndex] + 1, MAX_SAFE_INDEX);
  }

  get index0() {
    this.checkModification();
    return Math.min(this[kIndex], MAX_SAFE_INDEX);
  }

  get col0() {
    this.checkModification();
    return Math.max(0, this.col - 1);
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

  get col_first() {
    this.checkModification();
    return this.col === 1;
  }

  get col_last() {
    this.checkModification();
    return this.col === this.cols;
  }

  recalculatePosition() {
    if (this.cols > 0) {
      this.row = Math.floor(this[kIndex] / this.cols) + 1;
      this.col = (this[kIndex] % this.cols) + 1;
    }
  }

  increment() {
    if (this[kLocked]) {
      throw new Dry.Error('Cannot modify TableRowLoopDrop while iterating');
    }

    if (this[kIndex] < MAX_SAFE_INDEX) {
      this[kLocked] = true;
      try {
        this[kIndex]++;
        this[kVersion]++;
        this.recalculatePosition();
      } finally {
        this[kLocked] = false;
      }
    }
  }

  checkModification() {
    if (this[kLocked]) {
      throw new Dry.Error('Cannot read TableRowLoopDrop while being modified');
    }
  }

  setCols(newCols) {
    this.checkModification();
    this[kLocked] = true;
    try {
      this.cols = Math.max(1, Math.min(newCols, MAX_SAFE_INDEX));
      this.recalculatePosition();
      this[kVersion]++;
    } finally {
      this[kLocked] = false;
    }
  }
}

module.exports = TablerowloopDrop;
