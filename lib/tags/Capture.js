'use strict';

const BlockTag = require('../nodes/BlockTag');
const { constants, utils } = require('../Dry');

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
  CaptureSyntax = utils.r`${constants.regex.VARIABLE_SIGNATURE}+`;

  push(node) {
    super.push(node);

    if (node.type === 'close') {
      this.parse(this.match[3]);
    }
  }

  parse(markup) {
    if (this.Syntax(markup, this.CaptureSyntax)) {
      this.to = this.last_match[0];
    } else {
      throw new SyntaxError(this.state.locale.t('errors.syntax.capture'));
    }
  }

  render(context) {
    context.push({});

    context.resource_limits.with_capture(() => {
      context.set(this.to, super.render(context));
    });

    return '';
  }
}

module.exports = Capture;
