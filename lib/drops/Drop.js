'use strict';

const Dry = require('../Dry');
const cache = new Map();

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
        return key in target ? target[key] : target.invoke_drop(key);
      }
    });
  }

  // called by liquid to invoke a drop
  invoke_drop(method_or_key) {
    return this.liquid_method_missing(method_or_key);
  }

  liquid_method_missing(method) {
    if (this.context && this.context.strict_variables) {
      throw new Dry.UndefinedDropMethod(`Undefined drop method: "${method}"`);
    }
  }

  to_liquid() {
    return this;
  }

  to_s() {
    return this.toString();
  }

  toString() {
    return this.constructor.name;
  }

  // Check for method existence
  static invokable(method_name) {
    return this.invokable_methods.has(method_name.toString());
  }

  static get invokable_methods() {
    if (cache.has(this)) return cache.get(this);
    const blacklist = ['each', 'map', 'invoke_drop', 'liquid_method_missing', 'constructor', '__proto__', 'prototype', 'toString', 'to_s', 'inspect'];
    const methods = Reflect.ownKeys(this.prototype);
    const public_instance_methods = methods.filter(m => !blacklist.includes(m));
    const whitelist = ['to_liquid'].concat(public_instance_methods);
    const invokable_methods = new Set(whitelist.filter(n => typeof n === 'string').sort());
    cache.set(this, invokable_methods);
    return invokable_methods;
  }
}

module.exports = Drop;
