'use strict';

const get = require('expand-value');
const Dry = require('./Dry');

class TagRegistry {
  constructor() {
    this.tags  = new Map();
    this.cache = new Map();
  }

  get(tag_name) {
    if (!this.tags.has(tag_name)) return null;
    if (Dry.cache_classes) return this.cache.get(tag_name);
    const Tag = this.lookup_class(this.tags.get(tag_name));
    this.cache.set(tag_name, Tag);
    return Tag;
  }

  set(tag_name, Tag) {
    this.tags.set(tag_name, Tag.name);
    this.cache.set(tag_name, Tag);
  }

  delete(tag_name) {
    this.tags.delete(tag_name);
    this.cache.delete(tag_name);
  }

  each(fn) {
    this.tags.forEach(fn);
  }

  lookup_class(name) {
    return get(this.tags, name);
  }
}

module.exports = TagRegistry;
