'use strict';

const Dry = require('../Dry');

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

class Break extends Dry.Tag {
  static INTERRUPT = new Dry.tags.Interrupts.BreakInterrupt();

  render(context, output = '') {
    context.push_interrupt(Break.INTERRUPT);
    return output;
  }
}

module.exports = Break;
