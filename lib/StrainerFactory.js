'use strict';

const StrainerTemplate = require('./StrainerTemplate');

const kGlobalFilters = Symbol(':global_filters');
const kStrainerClassCache = Symbol(':strainer_class_cache');

// StrainerFactory is the factory for the filters system.
class StrainerFactory {
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

  static add_global_filter(filter) {
    this.strainer_class_cache.clear();
    this.global_filters.push(filter);
  }

  static set global_filters(value) {
    this[kGlobalFilters] = value;
  }
  static get global_filters() {
    return (this[kGlobalFilters] ||= []);
  }

  static set strainer_class_cache(value) {
    this[kStrainerClassCache] = value;
  }
  static get strainer_class_cache() {
    return (this[kStrainerClassCache] ||= new Map());
  }
}

module.exports = StrainerFactory;
