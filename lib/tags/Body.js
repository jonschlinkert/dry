'use strict';

const Tag = require('../nodes/Tag');

/**
 * The `break` tag is used to break out of a for loop.
 *
 * == Basic Usage:
 *    <!DOCTYPE html>
 *      <html lang="en">
 *      <body>
 *        {% body %}
 *      </body>
 *    </html>
 */

class Body extends Tag {
  render(context) {
    return context.evaluate(this.parse_expression(this.name));
  }
}

module.exports = Body;
