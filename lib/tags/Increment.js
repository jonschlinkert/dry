'use strict';

const { Tag } = require('../nodes');

// increment is used in a place where one needs to insert a counter
//     into a template, and needs the counter to survive across
//     multiple instantiations of the template.
//     (To achieve the survival, the application must keep the context)
//
//     if (the variable does not exist, it is created with value 0.) {
//
//   Hello: {% increment variable %}
//
// gives you:
//
//    Hello: 0
//    Hello: 1
//    Hello: 2
//
class Increment extends Tag {
  constructor(node, state) {
    super(node, state);
    this.variable = this.match[3];
  }

  render(context) {
    const value = (context.environments[0][this.variable] ||= 0);
    context.environments[0][this.variable] = value + 1;
    return String(value);
  }
}

module.exports = Increment;
