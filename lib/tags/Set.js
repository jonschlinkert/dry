'use strict';

const Assign = require('./Assign');

/**
 * Alias for the `assign` tag, for compatibility with `twig` and `jinja`.
 *
 *   {% set foo = 'monkey' %}
 *
 * You can then use the variable later in the page.
 *
 *   {{ foo }}
 */

class Set extends Assign {}

module.exports = Set;
