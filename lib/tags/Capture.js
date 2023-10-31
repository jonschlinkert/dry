
const Dry = require('../Dry');

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
class Capture extends Dry.BlockTag {
  static Syntax = Dry.utils.r`${Dry.regex.VariableSignature}+`;
  blank = true;

  push(node) {
    super.push(node);
    if (node.type === 'close') {
      this.markup = this.match[3];
      this.parse();
    }
  }

  parse() {
    if (this.ParseSyntax(this.markup, Capture.Syntax)) {
      this.to = this.last_match[0];
    } else {
      this.raise_syntax_error('capture');
    }
  }

  async render(context) {
    await context.resource_limits.with_capture(async () => {
      context.set(this.to, await super.render(context));
    });

    return '';
  }
}

module.exports = Capture;
