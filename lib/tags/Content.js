'use strict';

const Tag = require('../nodes/Tag');

/**
 * The `content` tag is used to render content in a layout.
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
    return context.evaluate(this.parse_expression(this.name));
  }
}

module.exports = Content;
