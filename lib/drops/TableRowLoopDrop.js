'use strict';

const kIndex = Symbol('index');
const Drop = require('./Drop');

class TablerowloopDrop extends Drop {
  constructor(length, cols) {
    super();
    this.length = length;
    this.row = 1;
    this.col = 1;
    this.cols = cols;
    this[kIndex] = 0;
  }

  set index(index) {
    this[kIndex] = index;
  }
  get index() {
    return this[kIndex] + 1;
  }

  get index0() {
    return this[kIndex];
  }

  get col0() {
    return this.col - 1;
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

  get col_first() {
    return this.col === 1;
  }

  get col_last() {
    return this.col === this.cols;
  }

  increment() {
    this[kIndex]++;

    if (this.col === this.cols) {
      this.col = 1;
      this.row++;
    } else {
      this.col++;
    }
  }
}

module.exports = TablerowloopDrop;
