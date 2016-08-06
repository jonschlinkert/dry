'use strict';

var utils = module.exports = require('lazy-cache')(require);
var fn = require;
require = utils;

/**
 * Lazily required module dependencies
 */

require('clone-deep', 'clone');
require('extend-shallow', 'extend');
require('isobject', 'isObject');
require('mixin-deep', 'merge');
require('get-value', 'get');
require('source-map', 'SourceMap');
require('source-map-resolve');
require = fn;

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
        return val.call(obj, obj);
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

/**
 * Return the given `val` unchanged
 * @param {*} `val`
 */

utils.identity = function(val) {
  return val;
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
  var args = str.split(/\s*\|\s*/);
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
 * Get the name of a block from `str`
 * TODO: move to parser
 * @param {String} `str`
 * @return {String}
 */

utils.getName = function(str) {
  str = str.trim();
  if (!str) return str;
  if (str.split(' ').length > 1) {
    throw new Error('multiple arguments not supported yet');
  }
  var segs = str.split('=');
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
  if (!str.trim()) return;
  var args = str.split(' ');
  if (args.length > 1) {
    throw new Error('multiple arguments not supported yet');
  }
  var segs = str.split('=');
  var type = 'replace';
  if (segs.length > 1) type = segs[0];
  return utils.chop(type);
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

utils.normalize = function(str) {
  return str ? str.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n') : '';
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
