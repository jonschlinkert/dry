'use strict';

const StrainerTemplate = require('./StrainerTemplate');

// StrainerFactory is the factory for the filters system.
class StrainerFactory {
  static strainer_class_cache = new Map();
  static global_filters = [];

  static create(context, filters = []) {
    const Strainer = this.strainer_from_cache(filters);
    return new Strainer(context);
  }

  static strainer_from_cache(filters) {
    let Strainer = this.strainer_class_cache.get(filters);
    if (!Strainer) {
      Strainer = class extends StrainerTemplate {};
      this.global_filters.forEach(f => Strainer.add_filter(f));
      filters.forEach(f => Strainer.add_filter(f));
      this.strainer_class_cache.set(filters, Strainer);
    }
    return Strainer;
  }

  static add_global_filter(filters) {
    this.strainer_class_cache.clear();
    this.global_filters.push(filters);
  }
}

module.exports = StrainerFactory;
