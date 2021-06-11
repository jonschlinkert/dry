'use strict';

const Dry = require('./Dry');
const to_s = method => typeof method === 'string' ? method : method.name;

//
// StrainerTemplate is the computed class for the filters system.
// New filters are mixed into the strainer class which is then instantiated
// for each liquid template render run.
//
// The Strainer only allows method calls defined in filters given to it via
// StrainerFactory.add_global_filter, Context#add_filters or Template.register_filter
//
class StrainerTemplate {
  static filter_methods = new Map();

  static add_filter(filters) {
    // if (filters.includes && filters.includes(StrainerTemplate)) return;

    // const invokable_non_public_methods = filters.private_instance_methods
    //   .concat(filters.protected_instance_methods)
    //   .filters(m => this.invokable(m));

    // if (invokable_non_public_methods.length > 0) {
    //   throw new Dry.MethodOverrideError(`Filter overrides registered public methods as non public: ${invokable_non_public_methods.join(', ')}`);
    // }

    StrainerTemplate.include(filters);

    // if (filters.public_instance_methods) {
    //   filters.public_instance_methods.forEach(m => StrainerTemplate.filter_methods.add(to_s(m)));
    // }
  }

  static include(filters) {
    if (typeof filters === 'function') {
      const omit = ['constructor', 'name', 'prototype', 'length', '__proto__'];
      const obj = {};

      for (const key of Reflect.ownKeys(filters)) {
        if (!omit.includes(key) && typeof filters[key] === 'function') {
          obj[key] = filters[key];
        }
      }

      filters = obj;
    }

    for (const [key, filter] of Object.entries(filters)) {
      StrainerTemplate.filter_methods.set(key, filter);
    }
  }

  static invokable(method) {
    return StrainerTemplate.filter_methods.has(to_s(method));
  }

  constructor(context) {
    this.context = context;
  }

  invoke(method, ...args) {
    try {
      if (StrainerTemplate.invokable(method)) {
        const filter = StrainerTemplate.filter_methods.get(method);
        const value = filter(...args);
        return (value && value?.to_liquid) ? value.to_liquid() : value;
      }
    } catch (err) {
      if (process.env.DEBUG) console.error(err);
      throw err;
    }

    if (this.context && this.context.strict_filters) {
      throw new Dry.UndefinedFilter(`undefined filter ${method}`);
    } else {
      return args[0];
    }
  }
}

module.exports = StrainerTemplate;
