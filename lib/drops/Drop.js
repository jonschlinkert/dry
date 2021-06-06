'use strict';

const { ownKeys } = Reflect;
const utils = require('../utils');

class UndefinedDropMethod extends Error {}

const kInvokableMethods = Symbol('invokable_methods');

// A drop in liquid is a class which allows you to export DOM like things to liquid.
// Methods of drops are callable.
// The main use for liquid drops is to implement lazy loaded objects.
// If you would like to make data available to the web designers which you don't want loaded unless needed then
// a drop is a great way to do that.
//
// Example:
//
//   class ProductDrop < Liquid.Drop
//     def top_sales
//       Shop.current.products.find(:all, :order => 'sales', :limit => 10 )
//     }
//   }
//
//   tmpl = Liquid.Template.parse( ' {% for product in product.top_sales %} {{ product.name }} {%endfor%} '  )
//   tmpl.render('product': ProductDrop.new ) // will invoke top_sales query.
//
// Your drop can either implement the methods sans any parameters
// or implement the liquid_method_missing(name) method which is a catch all.
class Drop {
  // Catch all for the method
  liquid_method_missing(method) {
    if (this.context.strict_variables) {
      throw new UndefinedDropMethod('undefined method ${method}');
    }
    return null;
  }

  // called by liquid to invoke a drop
  invoke_drop(method_or_key) {
    if (this.constructor.invokable(method_or_key)) {
      return this[method_or_key]();
    }
    return this.liquid_method_missing(method_or_key);
  }

  has(_name) {
    return true;
  }

  to_liquid() {
    return this;
  }

  // to_liquid() {
  //   const value = { length: this.length };
  //   const omit = ['constructor', 'valueOf', 'next', 'increment', 'to_liquid', 'node'];
  //   const seen = new Set();

  //   const set = key => {
  //     if (typeof key === 'string' && !seen.has(key) && !omit.includes(key)) {
  //       seen.add(key);

  //       if (this[key] != null) {
  //         value[key] = typeof this[key] === 'function' ? this[key]() : this[key];
  //       }
  //     }
  //   };

  //   for (const key of ownKeys(this.constructor.prototype)) set(key);
  //   for (const key of ownKeys(this)) set(key);
  //   return value;
  // }

  get inspect() {
    return this.constructor.toString();
  }

  get to_s() {
    return this.constructor.name;
  }

  // alias_method :[], :invoke_drop

  // Check for method existence without invoking respond_to?, which creates symbols
  static invokable(method_name) {
    return this.invokable_methods.has(method_name.toString());
  }

  static get invokable_methods() {
    return [];
    // if (this[kInvokableMethods]) return this[kInvokableMethods];
    // let blacklist = Reflect.ownKeys(Drop).concat('each');

    // if (include(Enumerable)) {
    //   blacklist += Enumerable.public_instance_methods;
    //   blacklist -= ['sort', 'count', 'first', 'min', 'max'];
    // }

    // const methods = public_instance_methods.filter(m => !blacklist.includes(m));
    // const whitelist = ['to_liquid', ...methods];
    // return (this[kInvokableMethods] = new Set(whitelist.map(String)));
  }
}

module.exports = Drop;
