'use strict';

const Dry = require('./Dry');

class PartialCache {
  static load(template_name, { context, state = {} } = {}) {
    try {
      const cached_partials = (context.registers['cached_partials'] ||= {});
      const cached = cached_partials[template_name];
      if (cached) return cached;

      const file_system = (context.registers['file_system'] ||= Dry.Template.file_system);
      const source      = file_system.read_template_file(template_name);

      state.partial = true;

      const template_factory = (context.registers['template_factory'] ||= new Dry.TemplateFactory());
      const template = template_factory.for(template_name);

      const partial = template.parse(source, state);
      return (cached_partials[template_name] = partial);
    } catch (err) {
      if (process.env.DEBUG) console.error(err);
      state.partial = false;
    }
  }
}

module.exports = PartialCache;
