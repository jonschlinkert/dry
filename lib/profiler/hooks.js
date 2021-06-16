'use strict';

const { defineProperty } = Reflect;

module.exports = Dry => {
  const Context = Dry.Context;
  const Document = Dry.Document;
  const BlockBody = Dry.BlockBody;
  const Parser = Dry.Parser;

  Dry.Profiler = require('../Profiler');

  defineProperty(Dry, 'BlockBody', {
    get() {
      return class extends BlockBody {
        render_node(context, node) {
          const profiler = context.profiler;
          if (profiler) {
            profiler.profile_node(context.template_name, { code: node.raw, line_number: node.line_number }, () => {
              return super.render_node(context, node);
            });
          } else {
            return super.render_node(context, node);
          }
        }
      };
    }
  });

  defineProperty(Dry, 'Document', {
    get() {
      return class extends Document {
        render(context) {
          if (context.profiler) {
            context.profiler.profile(context.template_name, this.options, () => {
              return super.render(context);
            });
          } else {
            return super.render(context);
          }
        }
      };
    }
  });

  defineProperty(Dry, 'Parser', {
    get() {
      return class extends Parser {
        render(context) {
          if (context.profiler) {
            context.profiler.profile(context.template_name, this.options, () => {
              return super.render(context);
            });
          } else {
            return super.render(context);
          }
        }
      };
    }
  });

  defineProperty(Dry, 'Context', {
    get() {
      return class extends Context {
        new_isolated_subcontext() {
          const new_context = super.new_isolated_subcontext();
          new_context.profiler = this.profiler;
          return new_context;
        }
      };
    }
  });
};
