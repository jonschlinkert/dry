'use strict';

var utils = require('./utils');

/**
 * Create a new `RegexCache` for caching compiled regex.
 */

function RegexCache() {
}

/**
 * Add a regex `type`
 * @param {String} `type`
 * @return {Object} returns the instance for chaining
 */

RegexCache.prototype.type = function(type) {
  return this[type] || (this[type] = {});
};

/**
 * Create a new `type` cache, with the given `name` and regex or string `val`
 * @param {String} `type`
 * @param {String} `name`
 * @param {String|RegExp} `val`
 */

RegexCache.prototype.cache = function(type, name, val) {
  var cache = this.type(type);

  if (cache.hasOwnProperty(name)) {
    return cache[name];
  }

  var cached = cache[name] = { name, val };
  utils.define(cached, 'source', function() {
    return val instanceof RegExp ? val.source : val;
  });

  utils.define(cached, 'escaped', function() {
    return utils.escapeString(this.source);
  });

  utils.define(cached, 'strict', function() {
    return new RegExp('^' + this.val);
  });

  utils.define(cached, 'loose', function() {
    return new RegExp(this.val);
  });

  return cached;
};

/**
 * Cache regex `name` with the given `val`
 * @param {String} `name`
 * @param {String|RegExp} `val`
 */

RegexCache.prototype.create = function(name, val) {
  return this.cache('expression', name, val);
};

/**
 * Cache regex for variable `name`
 * @param {String} `name`
 */

RegexCache.prototype.createVariable = function(name) {
  return this.cache('variable', name, `\\{%\\s*${name}\\s*%\\}`);
};

/**
 * Cache tag regex `name` with the given `val`
 * @param {String} `name`
 * @param {String|RegExp} `val`
 */

RegexCache.prototype.createTag = function(name) {
  return this.cache('tag', name, `\\{%\\s*${name}([^%]+?)%\\}`);
};

/**
 * Cache opening block regex for `name`
 * @param {String} `name`
 */

RegexCache.prototype.createOpen = function(name) {
  return this.cache('open', name, `\\{%\\s*${name}\\s*([^%]+?)\\s*%\\}`);
};

/**
 * Cache closing block regex for `name`
 * @param {String} `name`
 */

RegexCache.prototype.createClose = function(name) {
  return this.cache('close', name, `\\{%\\s*end${name}\\s*%\\}`);
};

/**
 * Expose `RegexCache`
 */

module.exports = RegexCache;
