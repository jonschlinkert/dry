'use strict';

class ParseTreeVisitor {
  static for(node, callbacks) {
    const Visitor = node.constructor.ParseTreeVisitor || this;
    const visitor = new Visitor(node, callbacks);
    return visitor;
  }

  constructor(node, callbacks = new Map()) {
    this.node = node;
    this.callbacks = callbacks;
  }

  add_callback_for(...classes) {
    const block = classes.pop();
    const callback = node => block(node);
    classes.forEach(Node => this.callbacks.set(Node, callback));
    return this;
  }

  visit(context = null) {
    return this.children.map(node => {
      const callback = this.callbacks.get(node.constructor);
      if (!callback) return [node.name || node];

      const new_context = callback(node, context) || context;

      return [
        ParseTreeVisitor.for(node, this.callbacks).visit(new_context)
      ];
    });
  }

  get children() {
    return this.node.nodes || [];
  }
}

module.exports = ParseTreeVisitor;
