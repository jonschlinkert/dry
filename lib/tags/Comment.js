'use strict';

const BlockTag = require('../nodes/BlockTag');

// The Comment tag is used for adding comments that will not be rendered in the output.
//
//   {# comment #}
//     Monkeys!
//   {# endcomment #}
//
class Comment extends BlockTag {
  blank = true;

  // push(node) {
  //   super.push(node);

  //   if (node.type === 'close') {
  //     const first = this.nodes[0];

  //     if (first && first.prev && first.value[2] === '-') {
  //       first.prev.value = first.prev.value.replace(/\n[^\S\n]*$/, '');
  //     }
  //   }
  // }

  render() {
    // const last = this.nodes[this.nodes.length - 1];
    // if (last.value[last.value.length - 3] === '-' && this.next) {
    //   this.next.value = this.next.value.replace(/^[^\S\n]*\n/, '');
    // }
    return this.render_to_output_buffer();
  }

  render_to_output_buffer() {
    return '';
  }

  unknown_tag() {}
}

module.exports = Comment;
