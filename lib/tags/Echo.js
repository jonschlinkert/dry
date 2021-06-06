'use strict';

const Variable = require('../nodes/Variable');
const Tag = require('../nodes/Tag');

// Echo outputs an expression
//
//   {% echo monkey %}
//   {% echo user.name %}
//
// This is identical to variable output syntax, like {{ foo }}, but works
// inside {% liquid %} tags. The full syntax is supported, including filters:
//
//   {% echo user | link %}
//
class Echo extends Tag {
  constructor(tag_name, markup, parse_context) {
    super(tag_name, markup, parse_context);
    this.variable = new Variable(markup, parse_context);
  }

  render(context) {
    return this.variable.render_to_output_buffer(context, '');
  }
}

// class ParseTreeVisitor extends Liquid.ParseTreeVisitor {
//   get children() {
//     [this.node.variable]
//   }
// }

module.exports = Echo;
