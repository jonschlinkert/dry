'use strict';

const BlockTag = require('../nodes/BlockTag');

class Comment extends BlockTag {
  render() {
    return '';
  }

  get blank() {
    return true;
  }
}

module.exports = Comment;
