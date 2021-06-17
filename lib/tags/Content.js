'use strict';

const Tag = require('../nodes/Tag');
const Expression = require('../Expression');

/**
 * The `break` tag is used to break out of a for loop.
 *
 * == Basic Usage:
 *    <!DOCTYPE html>
 *      <html lang="en">
 *      <body>
 *        {% content %}
 *      </body>
 *    </html>
 */

class Content extends Tag {
  render(context) {
    return context.evaluate(Expression.parse(this.name));
  }
}

module.exports = Content;
