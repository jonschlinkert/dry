
const fs = require('fs');
const path = require('path');
const { default: get } = require('get-value');
const { kLocale } = require('./constants/symbols');
const { isPlainObject } = require('./shared/utils');

const DEFAULT_LOCALE = path.join(__dirname, 'locales', 'en.yml');

class I18n {
  constructor(path = DEFAULT_LOCALE) {
    this.path = path;
  }

  translate(key, variables = {}) {
    return this.interpolate(this.get(key), variables);
  }

  t(...args) {
    return this.translate(...args);
  }

  interpolate(value, variables = {}) {
    if (Array.isArray(value)) {
      return value.map(v => this.interpolate(v, variables));
    }

    if (isPlainObject(value)) {
      for (const key of Object.keys(value)) {
        value[key] = this.interpolate(value[key], variables);
      }
      return value;
    }

    if (typeof value === 'string') {
      return value.replace(/%\{(\w+)\}/g, (m, $1) => {
        if (!variables[$1]) {
          throw new Error(`Undefined key ${$1} for interpolation in translation ${value}`);
        }
        return variables[$1];
      });
    }
    return value;
  }

  get(key) {
    const value = get(this.locale, key);

    if (!value) {
      throw new Error(`Translation for ${key} does not exist in locale ${path}`);
    }

    return value;
  }

  set locale(value) {
    this[kLocale] = null;
    this.path = value;
  }
  get locale() {
    if (!this[kLocale]) {
      const yaml = require('yaml');
      this[kLocale] = yaml.parse(fs.readFileSync(this.path, 'utf8'));
    }
    return this[kLocale];
  }

  static get DEFAULT_LOCALE() {
    return DEFAULT_LOCALE;
  }
}

module.exports = I18n;
