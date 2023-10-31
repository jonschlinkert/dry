
const Raw = require('./Raw');

/**
 * The `verbatim` tag is an alias for `raw`, which preserves sections as raw text,
 * that will not be evaluated.
 *
 *    {% verbatim %}
 *      <ul>
 *      {% for item in seq %}
 *        <li>{{ item }}</li>
 *      {% endfor %}
 *      </ul>
 *    {% endverbatim %}
 */

class Verbatim extends Raw {}

module.exports = Verbatim;
