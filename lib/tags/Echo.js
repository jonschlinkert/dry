'use strict';

const Variable = require('../nodes/Variable');
const Tag = require('../nodes/Tag');
const Dry = require('../Dry');

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
  constructor(node, state) {
    super(node, state);
    node.markup = node.match[3];
    this.variable = new Variable(node, state);
  }

  render(context) {
    return this.variable.render(context);
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  get children() {
    return [this.node.variable];
  }
}

module.exports = Echo;
