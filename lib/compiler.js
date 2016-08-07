'use strict';

var path = require('path');
var Parser = require('./parser');
var utils = require('./utils');

/**
 * Create a new `Compiler` with the given `options`.
 * @param {Object} `options`
 */

function Compiler(file, options) {
  this.options = options || {};
  this.parser = new Parser(options);
  this.compilers = {};
  this.files = [];
  this.file = file;
  this.files = [this.file];
  this.init();
}

/**
 * Compile `ast`.
 */

Compiler.prototype.init = function() {
  this.indentation = this.options.indent || '  ';
  var file = this.file;
  var self = this;

  this.setBlock('block');
  var keys = Object.keys(this.options.helpers || {});
  keys.forEach(function(key) {
    self.setBlock(key);
  });

  this.set('text', function(node) {
    return this.emit(node.val);
  });

  this.set('expression', function(node) {
    return this.emit(node.val);
    // var fn = utils.compose(node.rawArgs, this.options);
    // var val = node.val;
    // if (typeof fn === 'function') {
    //   var context = this.context();
    //   context.node = utils.clone(node);
    //   val = fn.call(context, context);
    // }
    // return this.emit(val);
  });

  this.set('body', function(node) {
    return '';
  });

  this.set('layout', function(node) {
    return '';
  });

  this.set('extends', function(node) {
    return '';
  });

  this.set('newline', function(node, nodes, i) {
    if (this.options.trim === true) {
      return trimLines(node, nodes, i);
    }
    if (this.options.condense !== false) {
      return '\n';
    }
    return this.emit(node.val, nodes, i);
  });

  this.set('space', function(node, nodes, i) {
    return this.emit(node.val, nodes, i);
  });

  this.file.fn = function(locals) {
    self.applyLayouts(file);
    var parent = self.getParent('extends');
    var str = self.compile(parent.ast, locals);
    file.contents = new Buffer(str);
    return str;
  };
};

Compiler.prototype.set = function(name, fn) {
  this.compilers[name] = fn;
  return this;
};

/**
 * TODO
 */

Compiler.prototype.context = function(locals) {
  return utils.merge({}, this.options.locals, locals);
};

Compiler.prototype.setBlock = function(name, fn) {
  this.set(name, function(node, nodes, i) {
    var tok = this.getNode(node);
    if (typeof fn === 'function') {
      return fn(tok, nodes, i);
    }
    var helper = this.getHelper(tok);
    if (helper) {
      return this.callHelper(tok, helper);
    }
    if (tok.nodes) {
      return this.mapVisit(tok.nodes);
    }
    return this.emit(tok.val);
  });

  this.set(`${name}.open`, function(node) {
    return '';
  });

  this.set(`${name}.close`, function(node) {
    return '';
  });
};

/**
 * Compile `ast`.
 * TODO: use `new Function`.
 * this is a placeholder
 */

Compiler.prototype.compile = function(node) {
  if (node.nodes) {
    return this.mapVisit(node.nodes);
  } else {
    return this.visit(node);
  }
};

/**
 * Emit `str`
 */

Compiler.prototype.emit = function(str) {
  return utils.toString(str).replace(/^\n+|\n+$/g, '');
};

/**
 * Visit `node`.
 */

Compiler.prototype.visit = function(node, nodes, i) {
  var fn = this.compilers[node.type];
  if (typeof fn !== 'function') {
    throw new Error(`compiler "${node.type}" is not registered`);
  }
  return fn.call(this, node, nodes, i);
};

/**
 * Map visit over array of `nodes`, optionally using a `delim`
 */

Compiler.prototype.mapVisit = function(nodes, delim) {
  var len = nodes.length;
  var idx = -1;
  var str = '';
  while (++idx < len) {
    str += this.visit(nodes[idx], nodes, idx);
    if (delim && idx < len - 1) {
      str += this.emit(delim);
    }
  }
  return str;
};

/**
 * Get a node from the ast of the given file
 */

Compiler.prototype.getNode = function(node) {
  var files = this.files;
  var type = node.type;
  var name = node.name;
  var len = files.length;
  var idx = -1;
  while (++idx < len) {
    var ast = files[idx].ast;
    var blocks = ast.blocks;
    var tok;
    if (blocks && blocks[type] && (tok = blocks[type][name])) {
      node = this.updateNodes(utils.clone(tok), node);
    }
  }
  return node;
};

Compiler.prototype.updateNodes = function(tok, node) {
  var nodes = node.nodes.slice(1, node.nodes.length - 1);
  var len = tok.nodes.length;
  switch (tok.action) {
    case 'append':
      tok.nodes.splice(1, 0, ...nodes);
      break;
    case 'merge':
      visitDeep(node, tok, function(a, b) {});
      // fall through
    case 'prepend':
      tok.nodes.splice(len - 1, 0, ...nodes);
      break;
    case 'replace':
    default: {
      break;
    }
  }
  return tok;
};

Compiler.prototype.applyLayouts = function(file) {
  if (!file.layout) return file;

  var layout = findFile(file.layout, this.options.files);
  if (!layout) {
    throw new Error(`cannot resolve layout "${file.layout}"`);
  }

  var restore = this.replaceNodes(layout, file);
  layout.ast.blocks.body = file.ast.nodes;
  var blocks = layout.ast.blocks.block;
  var child = file.ast.blocks.block;

  for (var key in blocks) {
    if (blocks.hasOwnProperty(key) && child[key]) {
      var block = blocks[key];
      var node = child[key];
      visitDeep(block, node, function(a, b) {
        if (a.type === 'text' && block.name !== 'body' && !layout.layout) {
          a.val = '';
        }
      });
    }
  }

  if (layout.layout) {
    this.applyLayouts(layout);
  }

  file.ast.nodes = utils.clone(layout.ast.nodes);
  restore.forEach(function(node) {
    node.restore();
  });

  return file;
};

Compiler.prototype.getParent = function(prop) {
  var files = this.files;
  var temp = this.file;
  var parent;
  while ((parent = this.getFile(temp, prop))) {
    parent.ast; //<= trigger getter
    files.unshift(parent);
    temp = parent;
  }
  parent = files.shift();
  return parent;
};

Compiler.prototype.getFile = function(file, prop) {
  var name = file[prop] || this.options[prop];
  if (name) {
    var found = findFile(name, this.options.files);
    if (typeof found === 'undefined') {
      throw new Error(`tag "${prop}" cannot find "${name}", in ${file.relative}`);
    }
    return found;
  }
};

Compiler.prototype.replaceNodes = function(layout, file) {
  var restore = [];
  var blocks = file.ast.blocks.block;
  var nodes = layout.ast.nodes;
  var len = nodes.length;
  var idx = -1;

  while (++idx < len) {
    var node = nodes[idx];
    if (node.type === 'block' && !file.ast.isLayout && blocks[node.name]) {
      var cloned = utils.clone(nodes[idx]);

      node.restore = (function(i) {
        return function() {
          nodes[i] = cloned;
        };
      })(idx);

      nodes[idx] = utils.clone(blocks[node.name]);
      blocks[node.name].nodes = [];
      restore.push(node);
    }
  }
  return restore;
};

Compiler.prototype.getHelper = function(node) {
  var helpers = this.options.helpers || {};
  return utils.get(helpers, node.type);
};

Compiler.prototype.callHelper = function(node, helperFn) {
  if (!Array.isArray(node.args)) {
    throw new TypeError('expected node.args to be an array: ' + node.args);
  }
  var thisArg = { name: node.name };
  var self = this;
  // TODO:
  // - parse helper args
  // - create valid javascript expression,
  // - create new function
  thisArg.fn = function(context) {
    return self.compile(node);
  };
  return helperFn.apply(thisArg, utils.parseArgs(node.args));
};

/**
 * Handle indentation
 * TODO
 */

Compiler.prototype.indent = function(level) {
  var indent = this.indentation;
  this.level = this.level || 1;
  if (typeof level === 'undefined') {
    return utils.repeat(indent, this.level);
  }
  this.level += level;
  return '';
};

function findFile(name, files) {
  var file = files[name];
  if (file) {
    file.ast; //<= trigger getter
    return file;
  }

  for (var key in files) {
    if (files.hasOwnProperty(key)) {
      file = files[key];
      var isMatch = file.path === name
        || file.relative === name
        || path.relative(file.cwd, file.path) === name
        || file.basename === name
        || file.stem === name;

      if (isMatch) {
        file.ast; //<= trigger getter
        return file;
      }
    }
  }
}

function visitDeep(a, b, fn) {
  if (!a || !b) return;
  var anodes = a.nodes || [];
  var bnodes = b.nodes || [];
  var len = anodes.length;
  var idx = -1;

  while (++idx < len) {
    var anode = anodes[idx];
    var bnode = bnodes[idx];
    if (anode && anode.nodes) {
      visitDeep(anode, bnode, fn);
    } else {
      fn(anode, bnode, anodes, bnodes, idx);
    }
  }
}

function trimLines(node, nodes, i) {
  var next = nodes[i + 1];
  var prev = nodes[i - 1];
  if (next && next.nodes && prev && prev.nodes) {
    return '';
  }
  return '\n';
}

/**
 * Expose `Compiler`.
 */

module.exports = Compiler;
