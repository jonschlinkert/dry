
const Dry = require('../../..');
const { utils } = Dry;

const kScript = Symbol(':script');

/**
 * Returns a Google Analytics tag.
 *
 * == Basic Usage:
 *
 *    {% google_analytics 'UA-XXXXX-X' %}
 */

class GoogleAnalytics extends Dry.Tag {
  static Syntax = utils.r`^(?:(["'\`])((?:G|UA|YT|MO)-[a-zA-Z0-9-]+)\\1|${Dry.regex.QuotedFragment})(.*)$`;

  constructor(node, state) {
    super(node, state);

    if (this.Syntax(this.match[3], GoogleAnalytics.Syntax)) {
      const [m, quoted, inner] = this.last_match;
      this.variable = quoted ? inner : Dry.VariableLookup.parse(m);
    } else {
      throw new Dry.SyntaxError('Syntax Error in "ga" tag - Valid syntax: {% ga "account_id" %}');
    }
  }

  render(context) {
    const account_id = context.evaluate(this.variable) || this.variable.name;

    if (account_id === this.variable.name && this.variable.name === this.variable.markup) {
      throw new Dry.SyntaxError('Syntax Error in "ga" tag - Valid syntax: {% ga "account_id" %}');
    }

    return this.constructor.script(account_id);
  }

  static set script(value) {
    this[kScript] = value;
  }
  static get script() {
    if (this[kScript]) return this[kScript];

    return account_id => `
<script type="text/javascript">
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
  ga('create', '${account_id}', 'auto');
  ga('send', 'pageview');
</script>
    `;
  }
}

module.exports = GoogleAnalytics;
