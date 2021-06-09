'use strict';

const util = require('util');
const errors = require('../errors');
const utils = require('../utils');
const cache = new Map();

const resolve = (value, context) => {
  return typeof value === 'function' ? resolve(value.call(context), context) : value;
};

/**
 * A drop in liquid is a class which allows you to export DOM like things to liquid.
 * Methods of drops are callable.
 *
 * The main use for liquid drops is to implement lazy loaded objects. If you would
 * like to make data available to the web designers which you don't want loaded unless
 * needed then a drop is a great way to do that.
 *
 * Example:
 *
 *   class ProductDrop extends Liquid.Drop
 *     top_sales() {
 *       return Shop.current.products.find({ all: true, order: 'sales', limit: 10 });
 *     }
 *   }
 *
 *   tmpl.render({ product: new ProductDrop() }) // will invoke top_sales query.
 *
 * Your drop can either implement the methods sans any parameters
 * or implement the liquid_method_missing(name) method which is a catch all.
 */

class Drop {
  constructor() {
    return new Proxy(this, {
      get(target, key, receiver) {
        return key in target ? target[key] : target.invoke_drop(key, receiver);
      }
    });
  }

  // called by liquid to invoke a drop
  invoke_drop(method_or_key, receiver) {
    if (this.constructor.invokable(method_or_key)) {
      return resolve(this[method_or_key], receiver);
    }

    if (method_or_key in this) {
      return this[method_or_key];
    }

    return this.liquid_method_missing(method_or_key);
  }

  liquid_method_missing(method) {
    if (this.context && this.context.strict_variables) {
      throw new errors.UndefinedDropMethod(`Undefined drop method: "${method}"`);
    }
  }

  each(fn) {
    return fn.call(this);
  }

  map(value) {
    return resolve(typeof value === 'string' ? this[value] : value, this);
  }

  key(key) {
    return key in this;
  }

  has(name) {
    return this.key(name);
  }

  to_liquid() {
    return this;
  }

  to_s() {
    return this.constructor.name;
  }

  toString() {
    return this.to_s();
  }

  inspect() {
    return this.constructor.toString();
  }

  get count() {
    return 0;
  }

  // Check for method existence
  static invokable(method_name) {
    return this.invokable_methods.has(method_name.toString());
  }

  static get invokable_methods() {
    if (cache.has(this)) return cache.get(this);
    const blacklist = ['each', 'map', 'invoke_drop', 'key', 'liquid_method_missing', 'constructor', '__proto__', 'prototype', 'toString', 'to_s'];
    const names = utils.getAllMethodNames(this.prototype);
    const isProtected = key => this.prototype[key].protected === true;
    const methods = names.filter(k => typeof this.prototype[k] === 'function' && !isProtected(k));
    const public_instance_methods = methods.filter(m => !blacklist.includes(m));
    const whitelist = ['to_liquid'].concat(public_instance_methods);
    const invokable_methods = new Set(whitelist.filter(n => typeof n === 'string').sort());
    cache.set(this, invokable_methods);
    return invokable_methods;
  }

  [util.inspect.custom]() {
    return this;
  }
}

module.exports = Drop;
