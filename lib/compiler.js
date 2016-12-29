'use strict';

var Parser = require('./parser');
var utils = require('./utils');

/**
 * Create a new `Compiler` with the given `options`.
 * @param {Object} `options`
 */

function Compiler(file, options) {
  this.options = options || {};
  this.parser = new Parser(file, options);
  this.compilers = {};
  this.files = [];
  this.file = file;
  this.files = [this.file];
  this.result = '';
}

/**
 * Compile `ast`.
 */

Compiler.prototype.init = function() {
  if (this.isInitialized) return;

  this.indentation = this.options.indentation || ' ';
  this.isInitialized = true;
  this.addCompilers();

  this.file.fn = function(locals) {
    this.applyLayouts(this.file);
    var parent = this.getParent('extends');
    var str = this.compile(parent.ast, locals);
    if (this.options.normalizeWhitespace !== false) {
      str = str.replace(/\n{2,}/g, '\n\n');
      str = str.replace(/^\n+|\n+$/g, '');
      str += '\n';
    }
    this.file.contents = new Buffer(str);
    return str;
  }.bind(this);
};

Compiler.prototype.addCompilers = function() {
  var helpers = this.options.helpers || {};
  var unknown = Object.keys(this.file.ast.blocks || {});
  var lexer = this.lexer = this.parser.lexer;
  var self = this;

  this.addBlock('block');
  Object.keys(helpers).forEach(this.addBlock.bind(this));
  unknown.forEach(this.addBlock.bind(this));
  lexer.unknown.blocks.forEach(this.addBlock.bind(this));
  lexer.unknown.tags.forEach(function(key) {
    self.use(key, function(node) {
      return self.emit(node);
    });
  });

  this.use('text', function(node) {
    return this.emit(node);
  });

  this.use('expression', function(node) {
    return this.emit({type: 'expression', val: ''});
  });

  this.use('body', function(node) {
    return this.emit({type: 'body', val: ''});
  });

  this.use('layout', function(node) {
    return this.emit({type: 'layout', val: ''});
  });

  this.use('extends', function(node) {
    return this.emit({type: 'extends', val: ''});
  });

  this.use('variable', function(node) {
    return this.emit(node);
  });

  this.use('newline', function(node, nodes, i) {
    if (this.options.trim === true) {
      var val = trimLines(node, nodes, i);
      return this.emit({type: 'newline', val: val});
    }
    if (this.options.condense !== false) {
      return this.emit({type: 'newline', val: '\n'});
    }
    return this.emit(node);
  });

  this.use('space', function(node, nodes, i) {
    return this.emit(node);
  });
};

/**
 * Emit `str`
 */

Compiler.prototype.emit = function(node, delim) {
  var val = utils.isObject(node) ? node.val : node;
  if (this.isType(node, 'newline')) {
    return val;
  }
  return val.replace(/\n+/g, '\n');
};

/**
 * Return true if `node` is the given `type`
 */

Compiler.prototype.isType = function(node, type) {
  return typeof node === 'string' ? false : node.type === 'type';
};

/**
 * Compile `ast`.
 * TODO: use `new Function`.
 * this is a placeholder
 */

Compiler.prototype.compile = function(ast) {
  if (typeof ast === 'undefined') {
    return this.mapVisit(this.file.ast.nodes);
  }
  return this.mapVisit(ast.nodes);
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
  this.init();
  var len = nodes.length;
  var idx = -1;
  var str = '';

  while (++idx < len) {
    str += this.visit(nodes[idx], nodes, idx);
    if (delim && idx < len - 1) {
      str += this.emit({type: 'delim', val: delim});
    }
  }
  return str;
};

/**
 * Add a compiler `fn` with the given `name`
 */

Compiler.prototype.use = function(name, fn) {
  this.init();
  this.compilers[name] = fn;
  return this;
};

/**
 * Add a block compiler `fn` with the given `name`
 */

Compiler.prototype.addBlock = function(name, fn) {
  this.use(name, function(node, nodes, i) {
    if (!node.known) {
      return this.mapVisit(node.nodes);
    }

    this.level = node.level;
    var tok = this.getNode(node);
    var val = node.val;

    if (typeof fn === 'function') {
      val = fn(tok, nodes, i);
    } else {
      var helper = this.getHelper(tok);
      if (helper) {
        val = this.callHelper(tok, helper);
      } else if (tok.nodes) {
        val = this.mapVisit(tok.nodes);
      }
    }

    tok.val = val;
    return this.emit(tok);
  });

  this.use(`${name}.open`, function(node) {
    return !node.known ? this.emit(node) : '';
  });

  this.use(`${name}.close`, function(node) {
    return !node.known ? this.emit(node) : '';
  });
};

/**
 * Create rendering context
 */

Compiler.prototype.context = function(locals) {
  return utils.merge({}, this.options.locals, locals);
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

  var layoutFile = utils.findFile(file.layout, this.options.files);
  if (!layoutFile) {
    throw new Error(`cannot resolve layout "${file.layout}"`);
  }

  file.options = file.options || {};
  if (file.options.layouts && file.options.layouts[layoutFile.path]) {
    return file;
  }

  if (file === layoutFile) {
    return file;
  }

  var layout = utils.cloneDeep(layoutFile);
  this.layoutStack(file, layout);

  if (file !== this.file) {
    this.layoutStack(this.file, layout);
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

  if (file === this.file) {
    file.ast.nodes = utils.clone(layout.ast.nodes);
  } else {
    file.ast.nodes = layout.ast.nodes;
  }

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

Compiler.prototype.layoutStack = function(file, layout) {
  file.options = file.options || {};
  file.options.layouts = file.options.layouts || [];
  file.options.layouts[layout.path] = layout;
};

Compiler.prototype.getFile = function(file, prop) {
  var name = file[prop] || this.options[prop];
  if (name) {
    var found = utils.findFile(name, this.options.files);
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
  var args = utils.parseArgs(node.args) || [];
  var thisArg = { name: node.name, node: utils.clone(node) };
  args.push({ hash: { name: node.name } });
  var self = this;

  // TODO:
  // - parse helper args
  // - create valid javascript expression,
  // - create new function

  thisArg.fn = function(context) {
    return self.compile(node);
  };

  return helperFn.apply(thisArg, args);
};

/**
 * Handle indentation
 * TODO
 */

Compiler.prototype.indent = function(level) {
  this.level = this.level || 2;
  if (typeof level === 'undefined') {
    return utils.repeat('^*', this.level);
  }
  this.level += 2;
  return '';
};

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
