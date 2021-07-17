'use strict';

const Dry = require('../Dry');

/**
 * Capture stores the result of a block into a variable without rendering it inplace.
 *
 *   {% capture heading %}
 *     Monkeys!
 *   {% endcapture %}
 *   ...
 *   <h1>{{ heading }}</h1>
 *
 * Capture is useful for saving content for use later in your template, such as
 * in a sidebar or footer.
 */

class Capture extends Dry.BlockTag {
  static Syntax = Dry.utils.r`${Dry.regex.VariableSignature}+`;

  blank = true;

  parse(markup) {
    if (this.ParseSyntax(markup, Capture.Syntax)) {
      this.to = this.last_match[0];
    } else {
      this.raise_syntax_error('errors.syntax.capture');
    }
  }

  async render(context) {
    context.push({});

    await context.resource_limits.with_capture(async () => {
      context.set(this.to, await super.render(context));
    });

    return '';
  }

  push(node) {
    super.push(node);

    if (node.type === 'close') {
      this.parse(this.match[3]);
    }
  }
}

module.exports = Capture;
