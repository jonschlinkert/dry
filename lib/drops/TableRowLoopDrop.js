const kIndex = Symbol('index');
const Drop = require('./Drop');

class TablerowloopDrop extends Drop {
  constructor(length, cols) {
    super();
    this.length = Math.max(0, length);
    this.row = 1;
    this.col = 1;
    this.cols = Math.max(1, cols);
    this[kIndex] = 0;
  }

  set index(index) {
    this[kIndex] = Math.min(Math.max(0, index), this.length - 1);
  }

  get index() {
    return Math.min(this[kIndex] + 1, this.length);
  }

  get index0() {
    return Math.min(this[kIndex], this.length - 1);
  }

  get col0() {
    return Math.max(0, this.col - 1);
  }

  get rindex() {
    return Math.max(0, this.length - this[kIndex]);
  }

  get rindex0() {
    return Math.max(0, this.length - this[kIndex] - 1);
  }

  get first() {
    return this[kIndex] === 0;
  }

  get last() {
    return this[kIndex] >= this.length - 1;
  }

  get col_first() {
    return this.col === 1;
  }

  get col_last() {
    return this.col >= this.cols;
  }

  increment() {
    if (this[kIndex] < Number.MAX_SAFE_INTEGER) {
      this[kIndex]++;

      const currentCols = Math.max(1, this.cols);
      if (this.col >= currentCols) {
        this.col = 1;
        this.row++;
      } else {
        this.col++;
      }
    }
  }
}

module.exports = TablerowloopDrop;
