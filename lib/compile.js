'use strict';

var path = require('path');
var debug = require('debug')('dry');
var parser = require('./parser');
var utils = require('./utils');

/**
 * Compile `file.ast`
 * TODO: scaffold out `Compiler`
 */

function compile(file, options) {
  debug('compiling <%s>', file.path);
  var opts = utils.extend({}, options);
  var helperNames = Object.keys(opts.helpers || {});
  var files = [file];
  var compilers = {};

  function compiler(name, fn) {
    compilers[name] = fn;
  }

  file.fn = function(renderLocals) {
    parser(file, options);
    if (file.layout) {
      applyLayouts(file, opts);
    }
    var ast = getAst(file, files, 'extends', opts);
    var res = compileFn(ast, opts, renderLocals);
    file.contents = new Buffer(res);
    return res;
  };

  function callHelper(node, helper, ctx, options) {
    var thisArg = {name: node.name, context: ctx};
    thisArg.fn = function(context) {
      return compileFn(node, options, context);
    };
    return helper.apply(thisArg, node.args);
  }

  function compileFn(node, options, context) {
    var opts = utils.extend({}, options);
    var ctx = utils.merge({}, context);

    function compileBlock(name) {
      compiler(name, function(node, nodes, i) {
        node = getNode(node, files, opts);
        var helper = getHelper(node, opts);
        if (helper) {
          return callHelper(node, helper, ctx, opts);
        }
        if (node.nodes) {
          return mapVisit(node.nodes, visit);
        }
        return emit(node.val, nodes, i);
      });

      compiler(`${name}.open`, function(node) {
        return '';
      });

      compiler(`${name}.close`, function(node) {
        return '';
      });
    }

    compileBlock('block');
    helperNames.forEach(function(key) {
      compileBlock(key);
    });

    compiler('text', function(node, nodes, i) {
      return emit(node.val, nodes, i);
    });

    compiler('expression', function(node, nodes, i) {
      var fn = utils.compose(node.args, opts);
      var val = node.val;
      if (typeof fn === 'function') {
        val = fn(ctx);
      }
      return emit(val, nodes, i);
    });

    compiler('body', function(node, nodes, i) {
      return emit(node.val, nodes, i);
    });

    compiler('layout', function(node) {
      return '';
    });

    compiler('newline', function(node, nodes, i) {
      if (opts.trim === true) {
        return trimLines(node, nodes, i);
      }
      if (opts.condense !== false) {
        return '\n';
      }
      return emit(node.val, nodes, i);
    });

    compiler('space', function(node, nodes, i) {
      return emit(node.val, nodes, i);
    });

    return mapVisit(node.nodes, visit);
  }

  /**
   * Visit `node`.
   */

  function visit(node, nodes, i) {
    var fn = compilers[node.type];
    if (typeof fn !== 'function') {
      throw new Error(`compiler "${node.type}" is not registered`);
    }
    return fn(node, nodes, i);
  }

  function emit(str, nodes, i) {
    return str.replace(/^\n+|\n+$/g, '');
  }

  return file;
};

/**
 * Map visit over array of `nodes`
 */

function mapVisit(nodes, visit) {
  var len = nodes.length;
  var idx = -1;
  var str = '';
  while (++idx < len) {
    str += visit(nodes[idx], nodes, idx);
  }
  return str;
}

function applyLayouts(file, options) {
  var opts = utils.extend({}, options);
  var layout = findFile(file.layout, opts.files);
  if (!layout) {
    throw new Error(`cannot resolve layout "${file.layout}"`);
  }

  var restore = [];
  replaceNodes(layout, file);
  restore = restore.concat(layout.ast.restore);

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
    applyLayouts(layout, options);
  }

  file.ast.nodes = utils.clone(layout.ast.nodes);
  restore.forEach(function(node) {
    node.restore();
  });
  return file;
}

function replaceNodes(layout, file) {
  layout.ast.restore = [];

  var blocks = file.ast.blocks.block;
  var nodes = layout.ast.nodes;
  var len = nodes.length;
  var idx = -1;

  while (++idx < len) {
    var node = nodes[idx];
    if (node.type === 'block' && !file.ast.isLayout && blocks[node.name]) {
      var cloned = utils.clone(nodes[idx]);
      var i = idx;

      node.restore = function() {
        nodes[i] = cloned;
      };

      nodes[idx] = utils.clone(blocks[node.name]);
      blocks[node.name].nodes = [];
      layout.ast.restore.push(node);
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

function getAst(file, files, prop, options) {
  var temp = file;
  var block;
  while ((block = getFile(temp, prop, options))) {
    block.ast; //<= trigger getter
    files.unshift(block);
    temp = block;
  }
  block = files.shift();
  return block.ast;
}

function getFile(file, prop, options) {
  var opts = utils.extend({}, options);
  var name = file[prop] || opts.name;

  if (typeof name === 'undefined') {
    return null;
  }

  file.data = file.data || {};
  var files = file.data.files || opts.files;
  var found = findFile(name, files);

  if (name && typeof found === 'undefined') {
    throw new Error(`tag "${prop}" cannot find "${name}", in ${file.relative}`);
  }
  return found;
}

function findFile(name, files) {
  var file = files[name];
  if (file) {
    file.ast;
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
        file.ast;
        return file;
      }
    }
  }
}

function getNode(node, files, options) {
  var type = node.type;
  var name = node.name;
  var len = files.length;
  var idx = -1;
  while (++idx < len) {
    var blocks = files[idx].ast.blocks;
    var tok;
    if (blocks && blocks[type] && (tok = blocks[type][name])) {
      node = updateNodes(utils.clone(tok), node);
    }
  }
  return node;
}

function updateNodes(tok, node) {
  var nodes = node.nodes.slice(1, node.nodes.length - 1);
  var len = tok.nodes.length;
  switch (tok.action) {
    case 'append':
      tok.nodes.splice(1, 0, ...nodes);
      break;
    case 'merge':
      removeTextNodes(nodes);
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
}

/**
 * Preserve nodes but remove text
 */

function removeTextNodes(nodes) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].type === 'text') {
      nodes[i].val = '';
    }
  }
}

function getHelper(node, options) {
  var opts = utils.extend({}, options);
  var helpers = opts.helpers || {};
  return utils.get(helpers, node.type);
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
 * Expose `compile`
 */

module.exports = compile;
