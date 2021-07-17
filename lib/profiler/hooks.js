'use strict';

const { defineProperty } = Reflect;

module.exports = Dry => {
  const Context = Dry.Context;
  const Document = Dry.Document;
  const BlockNode = Dry.BlockNode;
  const Parser = Dry.Parser;

  Dry.Profiler = require('../Profiler');

  const render_node = BlockNode.render_node;

  BlockNode.render_node = function(context, output, node) {
    const profiler = context.profiler;
    if (profiler && node.type !== 'text' && node.type !== 'literal') {
      const options = { code: node.raw, line_number: node.loc ? node.loc.end.line : node.line_number };
      return profiler.profile_node(context.template_name, options, () => {
        return render_node.call(BlockNode, context, output, node);
      });
    } else {
      return render_node.call(BlockNode, context, output, node);
    }
  };

  defineProperty(Dry, 'Document', {
    get() {
      return class extends Document {
        render(context) {
          if (context.profiler) {
            return context.profiler.profile(context.template_name, this.options, () => {
              return super.render(context);
            });
          } else {
            return super.render(context);
          }
        }
      };
    }
  });

  const render = Parser.prototype.render;
  Parser.prototype.render = function(context) {
    if (context.profiler) {
      return context.profiler.profile(context.template_name, this.options, () => {
        return render.call(this, context);
      });
    } else {
      return render.call(this, context);
    }
  };

  const new_isolated_subcontext = Context.prototype.new_isolated_subcontext;
  Context.prototype.new_isolated_subcontext = function() {
    const new_context = new_isolated_subcontext.call(this);
    new_context.profiler = this.profiler;
    return new_context;
  };
};
