'use strict';

module.exports = Dry => {
  Dry.Tag = class Tag extends Dry.Tag {
    async render_to_output_buffer(context) {
      let output = '';

      await context.with_disabled_tags(this.constructor.disabled_tags, async () => {
        output += await super.render_to_output_buffer(context);
      });

      return output;
    }
  };
};
