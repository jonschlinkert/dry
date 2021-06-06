'use strict';

const { BreakInterrupt } = require('./Interrupts');
const Tag = require('../nodes/Tag');

// Break tag to be used to break out of a for loop.
//
// == Basic Usage:
//    {% for item in collection %}
//      {% if item.condition %}
//        {% break %}
//      {% endif %}
//    {% endfor %}
//
class Break extends Tag {
  constructor(node) {
    super(node);
    this.INTERRUPT = new BreakInterrupt();
  }

  render_to_output_buffer(context, output) {
    context.push_interrupt(this.INTERRUPT);
    return output;
  }
}

module.exports = Break;
