'use strict';

var utils = require('./utils');

function RegexCache(options) {
  this.regex = {};
  this.tags = {};
}

RegexCache.prototype.type = function(type) {
  return this.regex[type] || (this.regex[type] = {});
};

RegexCache.prototype.set = function(type, name, val) {
  var cache = this.type(type);

  if (cache.hasOwnProperty(name)) {
    return cache[name];
  }

  var cached = cache[name] = { name, val };
  define(cached, 'source', function() {
    return val instanceof RegExp ? val.source : val;
  });

  define(cached, 'escaped', function() {
    return utils.escapeString(this.source);
  });

  define(cached, 'strict', function() {
    return new RegExp('^' + this.val);
  });

  define(cached, 'loose', function() {
    return new RegExp(this.val);
  });

  return cached;
};

RegexCache.prototype.create = function(name, val) {
  return this.set('expression', name, val);
};

RegexCache.prototype.createTag = function(name) {
  return this.set('tag', name, `\\{%\\s*${name}([^%]+?)%\\}`);
};

RegexCache.prototype.createOpen = function(name) {
  return this.set('open', name, `\\{%\\s*${name}\\s*([^%]+?)\\s*%\\}`);
};

RegexCache.prototype.createClose = function(name) {
  return this.set('close', name, `\\{%\\s*end${name}\\s*%\\}`);
};

/**
 * Expose `RegexCache`
 */

module.exports = RegexCache;
