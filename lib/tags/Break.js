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
  render(context) {
    context.push_interrupt(new BreakInterrupt());
    this.parent.continue = true;
    return '';
  }
}

module.exports = Break;
