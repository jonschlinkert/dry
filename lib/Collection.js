'use strict';

const FileSystem = require('./FileSystem');
const Template = require('./Template');

class Collection {
  constructor(name, options) {
    this.name = name;
    this.options = { ...options };
    this.cache = new Map();
    this.files = new Map();
  }

  set(name, value) {
    this.cache.set(name, value);
    return value;
  }

  has(name) {
    return this.cache.has(name);
  }

  get(name) {
    return this.cache.get(name);
  }

  delete(name) {
    this.cache.delete(name);
    return true;
  }

  load(name, options, state) {
    if (this.cached.has(name)) return this.cached.get(name);

    const file_system = this.file_system || Template.file_system;
    const contents    = file_system.read_template_file(name);

    const factory = new Template.Factory();
    const template = factory.for(name);
    const parsed = template.parse(contents, state);

    this.cache.set(name, parsed);
    return parsed;
  }

  static load(template_name, context, state) {
    try {
      const templates = (context.registers['templates'] ||= {});
      const cached = templates[template_name];
      if (cached) return cached;

      const file_system = (context.registers['file_system'] ||= Template.file_system);
      const source      = file_system.read_template_file(template_name);

      state.partial = true;

      const factory = (context.registers['template_factory'] ||= new Template.Factory());
      const template = factory.for(template_name);
      const partial = template.parse(source, state);

      return (templates[template_name] = partial);
    } catch (err) {
      if (process.env.DEBUG) console.error(err);
      state.partial = false;
    }
  }
}

module.exports = Collection;
