
const Dry = require('../../..');
const { PartialCache, Template, shared: { helpers } } = Dry;

module.exports = async (type, node, context) => {
  // Though we evaluate this here we will only ever parse it as a string literal.
  const template_name = await context.evaluate(node.template_name_expr);
  if (!template_name) helpers.raise.argument_error(node, 'template', { type });

  const context_variable_name = node.alias_name || template_name.split('/').pop();
  let partial = PartialCache.load_type(type, template_name, { context, state: node.state });

  if (!partial) {
    partial = context.registers;
    const segs = template_name.split('/');

    while (segs.length) {
      partial = partial[segs.shift()];
    }

    if (partial && typeof partial === 'string') {
      partial = context.registers[template_name] = Template.parse(partial);
    }
  }

  if (!partial && node?.state?.options?.strict_errors) {
    node.raise_file_system_error('missing', { template_name, type });
  }

  return { context_variable_name, partial, template_name };
};
