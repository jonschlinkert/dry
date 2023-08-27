
const Dry = require('./Dry');

class PartialCache {
  static load_type(type, template_name, { context, state = {} } = {}) {
    const registers_key = type === 'partials' ? 'file_system' : type;
    const factory_key = type === 'partials' ? 'template_factory' : `${type}_factory`;

    try {
      const cached_partials = context.registers[`cached_${type}`] ||= {};
      const cached = cached_partials[template_name];
      if (cached) return cached;

      const file_system = context.registers[registers_key] ||= Dry.Template[registers_key];
      const source = file_system.read_template_file(template_name);

      state.path = template_name;
      state.partial = true;

      const template_factory = context.registers[factory_key] ||= new Dry.TemplateFactory();
      const template = template_factory.for(template_name);
      const partial = template.parse(source, state);

      return (cached_partials[template_name] = partial);
    } catch (err) {
      if (process.env.DEBUG) console.error(err);
      state.partial = false;
    }
  }

  static load(template_name, { context, state = {} } = {}) {
    return this.load_type('partials', template_name, { context, state });
  }
}

module.exports = PartialCache;
