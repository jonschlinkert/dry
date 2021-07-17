'use strict';

const Assign = require('./Assign');

/**
 * An alias for `assign`, for `twig` and `jinja` compatibility.
 *
 *   {% set foo = 'monkey' %}
 *
 * You can then use the variable later in the page.
 *
 *   {{ foo }}
 */

class Set extends Assign {
  name = 'set';
}

module.exports = Set;
