'use strict';

const BlockTag = require('../nodes/BlockTag');
const { r } = require('../utils');
const { regex: { VARIABLE_SIGNATURE } } = require('../constants');
const Syntax = r`(${VARIABLE_SIGNATURE})+`;

// Capture stores the result of a block into a variable without rendering it inplace.
//
//   {% capture heading %}
//     Monkeys!
//   {% endcapture %}
//   ...
//   <h1>{{ heading }}</h1>
//
// Capture is useful for saving content for use later in your template, such as
// in a sidebar or footer.
//
class Capture extends BlockTag {
  constructor(tag_name, markup, options) {
    super(tag_name, markup, options);
  }

  parse(markup, options = {}) {
    const match = Syntax.exec(markup);
    if (match) {
      this.to = match[1];
    } else {
      throw new SyntaxError(options.locale.t('errors.syntax.capture'));
    }
  }

  render_to_output_buffer(context, output) {
    context.resource_limits.with_capture(() => {
      context.scope[this.to] = this.render(context);
    });
    return output;
  }

  get blank_() {
    return true;
  }
}

module.exports = Capture;
