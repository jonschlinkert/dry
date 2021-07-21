'use strict';

const Dry = require('../Dry');

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

class Content extends Dry.Tag {
  async render(context) {
    return context.evaluate(this.parse_expression(this.name));
  }
}

module.exports = Content;
