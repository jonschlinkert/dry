'use strict';

const kFilterMethods = Symbol(':filter_methods');

const to_s = method => typeof method === 'string' ? method : method.name;

class MethodOverrideError extends Error {}
class UndefinedFilter extends Error {}
class ArgumentError extends Error {}

// StrainerTemplate is the computed class for the filters system.
// New filters are mixed into the strainer class which is then instantiated for each liquid template render run.
//
// The Strainer only allows method calls defined in filters given to it via StrainerFactory.add_global_filter,
// Context//add_filters or Template.register_filter
class StrainerTemplate {
  constructor(context) {
    this.context = context;
  }

  invoke(method, ...args) {
    try {
      if (StrainerTemplate.invokable(method)) {
        const filter = StrainerTemplate.filter_methods.get(method);
        return filter(...args);
      }
    } catch (e) {
      console.error(e);
      throw new ArgumentError(e);
    }

    if (this.context && this.context.strict_filters) {
      throw new UndefinedFilter(`undefined filter ${method}`);
    } else {
      return args[0];
    }
  }

  static add_filter(filter) {
    // if (filter.includes && filter.includes(StrainerTemplate)) return;

    // const invokable_non_public_methods = filter.private_instance_methods
    //   .concat(filter.protected_instance_methods)
    //   .filter(m => this.invokable(m));

    // if (invokable_non_public_methods.length > 0) {
    //   throw new MethodOverrideError(`Filter overrides registered public methods as non public: ${invokable_non_public_methods.join(', ')}`);
    // }

    StrainerTemplate.include(filter);

    // if (filter.public_instance_methods) {
    //   filter.public_instance_methods.forEach(m => StrainerTemplate.filter_methods.add(to_s(m)));
    // }
  }

  static include(filters) {
    for (const [key, filter] of Object.entries(filters)) {
      StrainerTemplate.filter_methods.set(key, filter);
    }
  }

  static invokable(method) {
    return StrainerTemplate.filter_methods.has(to_s(method));
  }

  static set filter_methods(value) {
    StrainerTemplate[kFilterMethods] = value;
  }
  static get filter_methods() {
    return (StrainerTemplate[kFilterMethods] ||= new Map());
  }
}

module.exports = StrainerTemplate;
