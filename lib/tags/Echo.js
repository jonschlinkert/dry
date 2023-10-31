
const Dry = require('../Dry');

/**
 * Echo outputs an expression
 *
 *   {% echo monkey %}
 *   {% echo user.name %}
 *
 * This is identical to variable output syntax, like {{ foo }}, but works
 * inside {% liquid %} tags. The full syntax is supported, including filters:
 *
 *   {% echo user | link %}
 */

class Echo extends Dry.Tag {
  constructor(node, state, parent) {
    super(node, state, parent);
    node.markup = node.match[3];
    this.variable = new Dry.Variable(node, state, this);
  }

  render(context) {
    return this.variable.render(context);
  }

  static get ParseTreeVisitor() {
    return class extends Dry.ParseTreeVisitor {
      get children() {
        return [this.node.variable];
      }
    };
  }
}

module.exports = Echo;
