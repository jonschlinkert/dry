'use strict';

module.exports = Dry => {
  Dry.Tag = class extends Dry.Tag {
    async render_to_output_buffer(context) {
      return context.with_disabled_tags(this.constructor.disabled_tags, () => {
        return super.render_to_output_buffer(context);
      });
    }
  };
};
