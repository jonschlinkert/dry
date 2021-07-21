'use strict';

const Dry = require('../Dry');

/**
 * The Comment tag is used for adding comments that will not be rendered in the output.
 *
 *   {# comment #}
 *     Monkeys!
 *   {# endcomment #}
 *
 */

class Comment extends Dry.BlockTag {
  blank = true;

  render() {
    return this.render_to_output_buffer();
  }

  render_to_output_buffer() {
    return '';
  }

  unknown_tag() {}
}

module.exports = Comment;
