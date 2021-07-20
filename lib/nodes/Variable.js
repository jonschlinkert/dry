'use strict';

const Dry = require('../Dry');
const { helpers: { variable }, regex, shared: { selectParser }, utils: { r } } = Dry;
const { strict_parse_with_error_mode_fallback } = selectParser;

const {
  ArgumentSeparator: as,
  FilterArgumentSeparator: fas,
  FilterSeparator: fs,
  QuotedFragment: q,
  TagAttributes: ta
} = regex;

class Variable extends Dry.Node {
  static JustTagAttributes        = r`^${ta}$`;
  static MarkupWithQuotedFragment = r('m')`(${q})\\s*(.*)`;
  static FilterMarkupRegex        = r('m')`${fs}\\s*(.*)`;
  static FilterParser             = r`(?:\\s+|${q}|${as})+`;
  static FilterArgsRegex          = r`(?:${fas}|${as})\\s*((?:\\w+\\s*:\\s*)?${q})`;
  static FilterPropertyRegex      = /^\s*(\w+)(.*)$/;

  constructor(node, state, parent) {
    if (typeof node === 'string') {
      node = { type: 'variable', value: node, match: [node, node] };
    }

    super(node, state, parent);
    const loc = node.loc?.end || node.loc || this.state.loc;
    const [, left = '', markup = '', right = ''] = this.match;

    this.name        = null;
    this.markup      = node.markup || markup || (!this.value.includes('{') && this.value);
    this.trim_left   = left.includes('-');
    this.trim_right  = right.includes('-') || (!markup && this.trim_left);
    this.line_number = loc ? loc.line : null;

    strict_parse_with_error_mode_fallback(this, this.markup);
  }

  markup_context(markup) {
    return `in "{{${markup}}}"`;
  }

  lax_parse(markup) {
    const results = variable.parse_variable_lax(markup, this);
    this.name = results.name;

    if (results.macro_call === true) {
      this.macro_call = true;
      this.name.macro = true;
      this.macro_args = results.macro_args;
    }

    if (results.array_literal === true) {
      this.array_literal = true;
      this.array_args = results.array;
    }

    this.filters = results.filters;
  }

  strict_parse(markup) {
    if (!markup) return;
    const results = variable.parse_variable_strict(markup, this);
    this.name = results.name;

    if (results.macro_call === true) {
      this.macro_call = true;
      this.name.macro = true;
      this.macro_args = results.macro_args;
    }

    if (results.array_literal === true) {
      this.array_literal = true;
      this.array_args = results.array;
    }

    this.filters = results.filters;
  }

  async render_array(context) {
    const output = await variable.render_array(this.array_args, context);
    return variable.apply_filters(output, this.filters, context);
  }

  async render_macro(context) {
    if (this.markup.trim() === 'super()' && context.has('parent')) {
      return context.get('parent');
    }

    const output = await variable.render_macro(this, this.name, this.macro_args, context);
    if (this.filters.length) {
      return variable.apply_filters(output, this.filters, context);
    }
    return output;
  }

  render_variable(context) {
    return variable.render_variable(this.name, this.filters, context);
  }

  render(context) {
    if (this.array_literal === true) return this.render_array(context);
    if (this.macro_call === true) return this.render_macro(context);
    return this.render_variable(context);
  }

  evaluate(context) {
    return this.render(context);
  }

  trim_whitespace(next = this.next) {
    if (this.trim_left && this.prev) {
      this.prev.value = this.prev.value.trimEnd();
    }

    if (this.trim_right && next) {
      next.value = next.value.trimStart();
    }
  }

  is_disabled() {
    return false;
  }

  get disabled_tags() {
    return [];
  }

  get raw() {
    return this.markup;
  }

  get loc() {
    return this.state.loc;
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  Parent = Variable;
  get children() {
    const { name, lookups } = this.node.name;
    return [name, ...lookups, ...this.node.filters.flat()].flat().filter(v => !(v instanceof Map));
  }
}

module.exports = Variable;
