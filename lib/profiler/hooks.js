
module.exports = Dry => {
  const Context = Dry.Context;
  const BlockNode = Dry.BlockNode;
  const Parser = Dry.Parser;

  const render = Parser.prototype.render;
  const render_node = BlockNode.render_node;
  const new_isolated_subcontext = Context.prototype.new_isolated_subcontext;

  Dry.Profiler = require('../Profiler');

  BlockNode.render_node = function(context, output, node) {
    const { profiler, template_name } = context;
    const line_number = node.loc?.end?.line || node.line_number;

    if (profiler && node.type !== 'text' && node.type !== 'literal') {
      return profiler.profile_node(template_name, { code: node.raw, line_number }, () => {
        return render_node.call(BlockNode, context, output, node);
      });
    } else {
      return render_node.call(BlockNode, context, output, node);
    }
  };

  Parser.prototype.render = function(context) {
    if (context.profiler) {
      return context.profiler.profile(context.template_name, this.options, () => {
        return render.call(this, context);
      });
    } else {
      return render.call(this, context);
    }
  };

  Context.prototype.new_isolated_subcontext = function() {
    const new_context = new_isolated_subcontext.call(this);
    new_context.profiler = this.profiler;
    return new_context;
  };
};
