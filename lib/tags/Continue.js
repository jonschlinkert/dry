'use strict';

const { ContinueInterrupt } = require('./Interrupts');
const Tag = require('../nodes/Tag');

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

class Continue extends Tag {
  render(context) {
    context.push_interrupt(new ContinueInterrupt());
    this.parent.continue = true;
    return '';
  }
}

module.exports = Continue;
