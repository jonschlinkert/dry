'use strict';

var util = require('util');
var define = require('define-property');

function Node(pos, node) {
  define(this, 'cache', node.cache || {});
  define(this, 'types', node.types || {});
  define(this, 'esc', this.esc);
  for (var key in node) this[key] = node[key];
  return pos(this);
}

Node.prototype.addNode = function(node) {
  this.nodes = this.nodes || [];
  this.addType(node.type);
  this.nodes.push(node);
  this.esc = this.esc || node.esc || '';
  node.parent = this;
  return this;
};

Node.prototype.addType = function(type) {
  this.types[type] = true;
};

Node.prototype.addChild = function(node) {
  this.addType(node.type);
  this.esc = this.esc || node.esc || '';
  node.parent = this;
};

Node.prototype.hasType = function(type) {
  return this.types.hasOwnProperty(type);
};

Object.defineProperty(Node.prototype, 'isEscaped', {
  configurable: true,
  set: function(val) {
    this.esc = val;
  },
  get: function() {
    return this.esc === '\\';
  }
});

Object.defineProperty(Node.prototype, 'root', {
  configurable: true,
  get: function() {
    if (this.type === 'root') {
      return this;
    }

    var parent = this.parent;
    while (parent) {
      if (parent && parent.type === 'root') {
        return parent;
      }
      parent = parent.parent;
    }
    return parent;
  }
});

/**
 * Expose `Node`
 */

module.exports = Node;
