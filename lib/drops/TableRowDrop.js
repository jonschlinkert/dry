'use strict';

const ForLoopDrop = require('./ForLoopDrop');
const { kIndex } = ForLoopDrop;

class TableRowDrop extends ForLoopDrop {
  constructor(length, cols) {
    super(length);
    this.length = length;
    this.cols = cols;
  }
  row() {
    return Math.floor(this[kIndex] / (this.cols || 1)) + 1;
  }
  col0() {
    return this[kIndex] % (this.cols || 1);
  }
  col() {
    return this.col0() + 1;
  }
  col_first() {
    return this.col0() === 0;
  }
  col_last() {
    return this.col() === this.cols;
  }
}

// class TableRowDrop extends ForLoopDrop {
//   constructor(length, cols) {
//     super(length, cols);
//     this.length = length;
//     this.cols = cols;
//     this.col = 1;
//     this.row = 1;
//   }

//   col0() {
//     return this.col - 1;
//   }

//   col_first() {
//     return this.col === 1;
//   }

//   col_last() {
//     return this.col === this.cols;
//   }

//   increment() {
//     this.index += 1;

//     if (this.col === this.cols) {
//       this.col = 1;
//       this.row += 1;
//     } else {
//       this.col += 1;
//     }
//   }
// }

module.exports = TableRowDrop;
