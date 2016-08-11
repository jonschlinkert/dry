'use strict';

var path = require('path');
var utils = module.exports = require('lazy-cache')(require);
var fn = require;
require = utils;

/**
 * Lazily required module dependencies
 */

require('clone-deep');
require('extend-shallow', 'extend');
require('isobject', 'isObject');
require('mixin-deep', 'merge');
require('get-value', 'get');
require('repeat-string', 'repeat');
require('source-map', 'SourceMap');
require('source-map-resolve');
require = fn;


utils.identity = function(val) {
  return val;
};

utils.findFile = function(name, files) {
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
};

utils.values = function(data, keys) {
  var len = keys.length;
  var vals = new Array(len);
  while (len--) {
    vals[len] = data[keys[len]];
  }
  return vals;
};

utils.interpolate = function(str, values) {
  return function(data) {
    var keys = Object.keys(data);
    var vals = values(data, keys);
    return Function(keys, 'return ' + str).apply(null, vals);
  };
};

utils.clone = function(node) {
  var val = utils.cloneDeep(node);
  utils.define(val, 'parent', function() {
    return node.parent;
  });
  utils.define(val, 'args', function() {
    return node.args;
  });
  return val;
};

/**
 * Define non-enumerable getter/setter `prop` on the given `obj`. If `val` is a function
 * it will be called when the getter is triggered.
 *
 * @param {Object} `obj`
 * @param {String} `prop`
 * @param {*} `val`
 * @return {*}
 */

utils.define = function(obj, prop, val) {
  var cached;
  Object.defineProperty(obj, prop, {
    configurable: true,
    set: function(newVal) {
      cached = newVal;
    },
    get: function() {
      if (typeof cached !== 'undefined') {
        return cached;
      }
      if (typeof val === 'function') {
        return (cached = val.call(obj, obj));
      }
      return val;
    }
  });
};

/**
 * Cast val to an array
 * @param {String|Array} `val`
 * @return {Array}
 * @api public
 */

utils.arrayify = function(val) {
  return val ? Array.isArray(val) ? val : [val] : [];
};

utils.toString = function(val) {
  return val ? val.toString() : '';
};

/**
 * Return the given `val` unchanged
 * @param {*} `val`
 */

utils.identity = function(val) {
  return val;
};

utils.parseArgs = function(val) {
  if (Array.isArray(val)) {
    return val;
  }

  return utils.toString(val)
    .split(/\s*\|\s*/)
    .filter(Boolean)
    .map(utils.chop);
};

/**
 * Compose a function from filter arguments in the given `str`
 * TODO: parse arguments with parser
 * @param {String} `str`
 * @param {Object} `options`
 * @return {Function}
 */

utils.compose = function(str, options) {
  var opts = utils.extend({}, options);
  var args = utils.parseArgs(str);
  var prop = args.shift();

  return function(context) {
    var val = utils.get(context, prop);
    var key;
    if (typeof val === 'undefined') {
      if (opts.strict === true) {
        throw new Error(`cannot find ${prop} on the context`);
      }
      return '';
    }

    while ((key = args.shift())) {
      var rest = [];
      if (!/^\w+$/.test(key)) {
        var segs = key.split(/[\s,]+/);
        key = segs.shift();
        rest = segs;
      }

      var fn = utils.get(opts.filters, key);
      if (typeof fn !== 'function') {
        throw new TypeError(`expected ${key} to be a filter function`);
      }

      var filterArgs = [val].concat(rest);
      val = fn.apply(context, filterArgs);
    }
    return val;
  };
};

/**
 * Get the block names from an array of strings
 * @param {Array} `arr`
 * @return {Array}
 */

utils.getNames = function(arr) {
  var matches = {blocks: [], tags: []};
  if (!arr) return matches;

  var blocks = [], all = [];
  var len = arr.length;
  var idx = -1;

  while (++idx < len) {
    var str = arr[idx];
    var name = utils.getName(str.split(' ')[1]);

    if (/^end/.test(name)) {
      blocks.push(name.replace(/^end/, ''));
    } else {
      all.push(name);
    }
  }

  matches.blocks = blocks.filter(function(tag) {
    return matches.blocks.indexOf(tag) === -1;
  });

  matches.tags = all.filter(function(name) {
    if (matches.blocks.indexOf(name) !== -1) {
      return false;
    }
    return matches.tags.indexOf(name) === -1;
  });

  return matches;
};

/**
 * Return true if the given `key` is a registered block or tag
 * @param {String} `str`
 * @return {String}
 */

utils.isRegistered = function(lexer, key) {
  var arr = lexer.known.tags.concat(lexer.known.blocks);
  var helpers = lexer.options.helpers || [];
  if (utils.isObject(helpers)) {
    helpers = Object.keys(helpers);
  }
  arr = arr.concat(helpers);
  return utils.has(arr, key);
};

/**
 * Get the name of a block from `str`
 * TODO: move to parser
 * @param {String} `str`
 * @return {String}
 */

utils.getName = function(str) {
  str = str ? str.trim() : '';
  if (!str) return str;
  var args = str.split(' ');
  var segs = args[0].split('=');
  if (segs.length > 1) {
    return utils.chop(segs[1]);
  }
  return utils.chop(str);
};

/**
 * Get the "action" to use on a block from the given `str`
 * TODO: move to parser
 * @param {String} str
 * @return {String}
 */

utils.getAction = function(str) {
  if (!str.trim()) return 'replace';
  var args = str.split(' ');
  var segs = args[0].split('=');
  var type = 'replace';
  if (segs.length > 1) type = segs[0];
  return utils.chop(type);
};

/**
 * Return true if `val` is in the given array
 */

utils.has = function(arr, val) {
  return arr.indexOf(val) !== -1;
};

/**
 * Get the last element from `array`
 * @param {Array} `array`
 * @return {*}
 */

utils.last = function(arr) {
  return arr[arr.length - 1];
};

/**
 * Normalize whitespace in the given `str`
 * @param {String} `str`
 * @return {String}
 */

utils.normalize = function(file) {
  if (file.isNormalized) return file;
  file.isNormalized = true;

  var contents = (file.contents.toString() || '')
    .replace(/\r\n|\r/g, '\n')
    .replace(/^\uFEFF/, '')

  file.contents = new Buffer(contents);
  return file;
};

/**
 * Strip non-word characters from the beginning and end of `str`
 * @param {String} str
 * @return {String}
 */

utils.chop = function(str) {
  return str.replace(/^\W+|\W$/g, '');
};

/**
 * Safely trim eos whitespace.
 * @param {String} str
 * @return {String}
 */

utils.trim = function(str) {
  if (!str) return '';
  var len = str.length;
  var idx = -1;
  while (++idx < len) if (!utils.isWhitespace(str[idx])) break;
  str = str.slice(idx);
  len -= idx;
  while (len--) if (!utils.isWhitespace(str[len])) break;
  return str.slice(0, len + 1);
};

/**
 * Escape regex characters in the given `str`
 * @param {String} `str`
 * @return {String}
 */

utils.escapeString = function(str) {
  return str.replace(/[({\[\]})^$\\\/.*+?|]/g, '\\$&');
};

utils.escapeDelims = function(a, b) {
  var sep = delimsMiddle(a, b);
  var lt = utils.escapeString(a) + '[-=]?'
  var rt = '[-=]?' + utils.escapeString(b);
  return lt + sep + rt;
};

utils.negateDelims = function(delimiters) {
  var delims = [];
  for (var key in delimiters) {
    if (delimiters.hasOwnProperty(key)) {
      var arr = delimiters[key];
      delims.push(utils.escapeDelims.apply(null, arr));
    }
  }
  return new RegExp(utils.notAny(delims));
};

utils.negateDelimsRegex = function(delimiters) {
  return new RegExp(utils.negateDelims(delimiters));
};

function delimsMiddle(a, b) {
  var m = b.match(/[\}>]/g);
  if (!m) return '[^}>]+?';
  if (!/%/.test(a) || m && m.length > 1) {
    return '[^}]+?';
  }
  return '[^%}]+?';
}

utils.negate = function(str) {
  return '^((?!' + str + ').)*';
};

utils.notAny = function(arr) {
  return utils.negate(arr.join('|') + '|[\\r\\n]');
};
