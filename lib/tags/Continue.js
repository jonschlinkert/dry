'use strict';

const { ContinueInterrupt } = require('./Interrupts');
const Tag = require('../nodes/Tag');

// Continue tag to be used to break out of a for loop.
//
// == Basic Usage:
//    {% for item in collection %}
//      {% if item.condition %}
//        {% continue %}
//      {% endif %}
//    {% endfor %}
//
class Continue extends Tag {
  constructor(node) {
    super(node);
    this.INTERRUPT = new ContinueInterrupt();
  }

  render_to_output_buffer(context, output) {
    context.push_interrupt(this.INTERRUPT);
    return output;
  }
}

module.exports = Continue;
