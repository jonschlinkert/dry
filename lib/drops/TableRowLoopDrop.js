'use strict';

const Drop = require('./Drop');

const kIndex = Symbol('index');

class TableRowLoopDrop extends Drop {
  constructor(length, cols) {
    super(length, cols);
    this.length = length;
    this.row = 1;
    this.col = 1;
    this.cols = cols;
    this.index = 0;
  }

  set index(value) {
    this[kIndex] = value;
  }
  get index() {
    return this[kIndex] + 1;
  }

  index0() {
    return this.index;
  }

  col0() {
    return this.col - 1;
  }

  rindex() {
    return this.length - this.index;
  }

  rindex0() {
    return this.length - this.index - 1;
  }

  first() {
    return this.index === 0;
  }

  last() {
    return this.index === this.length - 1;
  }

  col_first() {
    return this.col === 1;
  }

  col_last() {
    return this.col === this.cols;
  }

  increment() {
    this.index++;

    if (this.col === this.cols) {
      this.col = 1;
      this.row++;
    } else {
      this.col++;
    }
  }
}

module.exports = TableRowLoopDrop;
