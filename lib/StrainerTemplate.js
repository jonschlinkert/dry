'use strict';

const Dry = require('./Dry');
const to_s = method => typeof method === 'string' ? method : method.name;
const instance_cache = new Map();

/**
 * StrainerTemplate is the computed class for the filters system.
 * New filters are mixed into the strainer class which is then instantiated
 * for each liquid template render run.
 *
 * The Strainer only allows method calls defined in filters given to it via
 * StrainerFactory.add_global_filter, Context#add_filters or Template.register_filter
 */

class StrainerTemplate {
  static filter_methods = new Map();

  static add_filter(filters) {
    if (Array.isArray(filters)) {
      filters.forEach(f => this.add_filter(f));
      return;
    }

    StrainerTemplate.include(filters);
  }

  static include(filters) {
    if (typeof filters === 'function') {
      throw new Dry.TypeError('wrong argument type "function" (expected an object)');
    }

    if (typeof filters.included === 'function') {
      const instances = instance_cache.get(filters) || new Set();
      instance_cache.set(filters, instances);

      if (instances.has(this)) return;
      instances.add(this);
      filters.included(this);
    }

    for (const [key, filter] of Object.entries(filters)) {
      if (key === 'included') continue;
      if (key in Object) {
        throw new Dry.MethodOverrideError(`Dry error: Filter overrides registered public methods as non public: ${key}`);
      }

      StrainerTemplate.filter_methods.set(key, filter);
    }
  }

  static invokable(method) {
    return StrainerTemplate.filter_methods.has(to_s(method));
  }

  constructor(context) {
    this.context = context;
  }

  send(method, ...args) {
    const filter = StrainerTemplate.filter_methods.get(method);
    const value = filter(...args);
    return (value && value?.to_liquid) ? value.to_liquid() : value;
  }

  invoke(method, ...args) {
    if (this.constructor.invokable(method)) {
      return this.send(method, ...args);
    }

    const error = new Dry.UndefinedFilter(`undefined filter ${method}`);
    if (this.context.strict_filters) {
      throw error;
    }

    this.context.errors.push(error);
    return args[0];
  }
}

module.exports = StrainerTemplate;
