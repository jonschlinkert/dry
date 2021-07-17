'use strict';

const Dry = require('./Dry');

class LayoutCache {
  static load(template_name, { context, state = {} } = {}) {
    try {
      const cached_layouts = (context.registers['cached_layouts'] ||= {});
      const cached = cached_layouts[template_name];
      if (cached) return cached;

      let layouts = (context.registers['layouts'] ||= Dry.Template.layouts);
      if (!layouts.read_template_file) {
        layouts = context.registers['layouts'] = Dry.Template.layouts;
      }

      const source = layouts.read_template_file(template_name);
      state.partial = true;

      const template_factory = (context.registers['layout_factory'] ||= new Dry.TemplateFactory());
      const template = template_factory.for(template_name);

      const layout = template.parse(source, state);
      return (cached_layouts[template_name] = layout);
    } catch (err) {
      if (process.env.DEBUG) console.error(err);
      state.partial = false;
    }
  }
}

module.exports = LayoutCache;
