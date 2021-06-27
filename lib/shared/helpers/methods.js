'use strict';

const { empty, isObject, size } = require('../utils');

const toArray = value => {
  if (!value) return [];
  if (value instanceof Map) value = [...value.values()];
  if (typeof value.length === 'number' || typeof value.size === 'number') {
    return [...value];
  }
  return [];
};

const helpers = {
  empty(context) {
    return empty(context);
  },
  first(context) {
    if (isObject(context)) {
      return typeof context.first === 'function' ? context.first() : context.first;
    }
    const arr = toArray(context);
    return arr[0];
  },
  last(context) {
    if (isObject(context)) {
      return typeof context.last === 'function' ? context.last() : context.last;
    }
    const arr = toArray(context);
    return arr[arr.length - 1];
  },
  length(context) {
    return size(context);
    // if (isObject(context)) {
    //   const keys = Object.keys(context);
    //   if (keys.every(k => isNumber(k))) {
    //     context = Object.keys(context);
    //   } else {
    //     return typeof context.length === 'function' ? context.length() : context.length;
    //   }
    // }

    // if (context instanceof Set || context instanceof Map) {
    //   return context.size;
    // }

    // if (Array.isArray(context) || typeof context === 'string') {
    //   return context.length;
    // }
  },
  size(context) {
    return size(context);
    // if (isObject(context)) {
    //   const keys = Object.keys(context);
    //   if (keys.every(k => isNumber(k))) {
    //     context = Object.keys(context);
    //   } else {
    //     return typeof context.size === 'function' ? context.size() : context.size;
    //   }
    // }
    // if (context instanceof Set || context instanceof Map) {
    //   return context.size;
    // }
    // if (Array.isArray(context) || typeof context === 'string') {
    //   return context.length;
    // }
  }
};

module.exports = helpers;
