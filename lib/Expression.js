const Dry = require('./Dry');
const { regex, utils, RangeLookup, VariableLookup } = Dry;

class Expression {
  static LITERALS = {
    'nil': null, 'null': null, '': null,
    'true': true,
    'false': false,
    'blank': '',
    'empty': ''
  };

  static RANGES_REGEX   = /^\(\s*(?:(\S+)\s*\.\.)\s*(\S+)\s*\)$/; // (1..10)
  // static RANGES_REGEX   = /^\s*\(.*\)\s*$/;
  static INTEGERS_REGEX = /^([-+]?[0-9]+)$/;
  static FLOATS_REGEX   = /^([-+]?[0-9]+(?:\.[0-9]+)?)$/;
  static SPREAD_REGEX   = /^\.{3}([a-zA-Z_]\w*)/;
  static QUOTED_STRING  = utils.r('m')`^\\s*(${regex.QuotedString.source.slice(1)})\\s*`;

  static parse(markup) {
    if (markup == null) return markup;
    if (typeof markup === 'number') return markup;
    if (typeof markup === 'symbol') return markup;
    if (typeof markup === 'string') markup = markup.trim();

    if (hasOwnProperty.call(this.LITERALS, markup)) {
      return this.LITERALS[markup];
    }

    const exec = regex => (this.match = regex.exec(markup));

    if (exec(this.QUOTED_STRING)) return this.match[1].slice(1, -1);
    if (exec(this.INTEGERS_REGEX)) return Number(this.match[1]);
    if (exec(this.RANGES_REGEX)) {
      const parts = markup.trim().slice(1, -1).split(/\.{2,}/);
      if (parts.length === 2) {
        return RangeLookup.parse(parts[0], parts[1]);
      }
    }

    if (exec(this.FLOATS_REGEX)) return Number(this.match[0]);
    if (exec(this.SPREAD_REGEX)) {
      const output = VariableLookup.parse(this.match[1]);
      output.spread = true;
      return output;
    }

    return VariableLookup.parse(markup);
  }

  static isRange(markup) {
    return this.RANGES_REGEX.test(markup);
  }
}

module.exports = Expression;
