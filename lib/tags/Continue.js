'use strict';

const Dry = require('../Dry');

/**
 * Continue tag to be used to break out of a for loop.
 *
 * == Basic Usage:
 *    {% for item in collection %}
 *      {% if item.condition %}
 *        {% continue %}
 *      {% endif %}
 *    {% endfor %}
 */

class Continue extends Dry.Tag {
  static INTERRUPT = new Dry.tags.Interrupts.ContinueInterrupt();

  render(context, output = '') {
    context.push_interrupt(Continue.INTERRUPT);
    return output;
  }
}

module.exports = Continue;
