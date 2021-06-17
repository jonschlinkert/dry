'use strict';

module.exports = Dry => {
  Dry.Tag = class Tag extends Dry.Tag {
    render_to_output_buffer(context) {
      let output = '';

      context.with_disabled_tags(this.constructor.disabled_tags, () => {
        output += super.render_to_output_buffer(context);
      });

      return output;
    }
  };
};
