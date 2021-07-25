'use strict';

const Dry = require('../Dry');

/**
 * The Comment tag is used for adding block comments that will
 * not be rendered in the output.
 *
 *    {# comment #}
 *      Monkeys!
 *    {# endcomment #}
 *
 * Line comments have the following syntax:
 *
 *    {# this is a "line" comment #}
 *
 */

class Comment extends Dry.BlockTag {
  blank = true;
  render() {
    return '';
  }
  render_to_output_buffer() {
    return '';
  }
  unknown_tag() {}

  static get Line() {
    return LineComment;
  }
}

class LineComment extends Dry.Tag {
  blank = true;
  render() {
    return '';
  }
  render_to_output_buffer() {
    return '';
  }
  unknown_tag() {}
}

module.exports = Comment;
