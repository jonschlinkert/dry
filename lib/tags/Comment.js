'use strict';

const BlockTag = require('../nodes/BlockTag');

class Comment extends BlockTag {
  blank = true;
  render() {
    return '';
  }
}

module.exports = Comment;
