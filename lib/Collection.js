'use strict';

const Template = require('./Template');

class Collection {
  constructor(name, options) {
    this.options = options;
    this.name = name;
    this.templates = new Map();
  }

  template(file, options) {
    file.template = new Template(options);
    this.templates.set(file.path, file);
    return file;
  }
}

module.exports = Collection;
