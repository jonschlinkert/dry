'use strict';

module.exports = Dry => {
  Dry.Tag = class Tag extends Dry.Tag {
    render_to_output_buffer(context) {
      if (context.tag_disabled(this.tag_name)) {
        return this.disabled_error(context);
      }
      return super.render_to_output_buffer(context);
    }

    disabled_error(context) {
      try {
        // raise then rescue the exception so that the Context#exception_renderer can handle it
        throw new Dry.DisabledError(`${this.tag_name} ${this.state.locale.t('errors.disabled.tag')}`);
      } catch (exc) {
        context.handle_error(exc, this.line_number);
      }
    }
  };
};
