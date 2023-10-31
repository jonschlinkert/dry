
const Case = require('./Case');

/**
 * The `switch` tag works like a switch statement, and the `case` tag
 * is used for comparing values.
 *
 * == Basic Usage:
 *    {% switch handle %}
 *    {% case 'cake' %}
 *      This is a cake
 *    {% case 'cookie' %}
 *      This is a cookie
 *    {% else %}
 *      This is not a cake nor a cookie
 *    {% endswitch %}
 */

class Switch extends Case {}

module.exports = Switch;
