'use strict';

const { BreakInterrupt } = require('./Interrupts');
const Tag = require('../nodes/Tag');

/**
 * The `break` tag is used to break out of a for loop.
 *
 * == Basic Usage:
 *    {% for item in collection %}
 *      {% if item.condition %}
 *        {% break %}
 *      {% endif %}
 *    {% endfor %}
 */

class Break extends Tag {
  static INTERRUPT = new BreakInterrupt();

  render(context, output = '') {
    context.push_interrupt(Break.INTERRUPT);
    return output;
  }
}

module.exports = Break;
