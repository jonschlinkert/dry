'use strict';

const Dry = require('../Dry');
const Node = require('./Node');
const Expression = require('../Expression');
const Parser = require('../expressions/Parser');
const { constants: { regex }, shared: { utils, selectParser } } = Dry;
const { r, scan } = utils;
const { strict_parse_with_error_mode_fallback } = selectParser;

const {
  ARGUMENT_SEPARATOR,
  FILTER_ARGUMENT_SEPARATOR,
  FILTER_SEPARATOR,
  QUOTED_FRAGMENT,
  TAG_ATTRIBUTES
} = regex;

const FILTER_MARKUP_REGEX         = r('m')`${FILTER_SEPARATOR}\\s*(.*)`;
const FILTER_PARSER               = r`(?:\\s+|${QUOTED_FRAGMENT}|${ARGUMENT_SEPARATOR})+`;
const JUST_TAG_ATTRIBUTES         = r`^${TAG_ATTRIBUTES}$`;
const MARKUP_WITH_QUOTED_FRAGMENT = r('m')`(${QUOTED_FRAGMENT})(.*)`;
const FILTER_ARGS_REGEX           = r`(?:${FILTER_ARGUMENT_SEPARATOR}|${ARGUMENT_SEPARATOR})\\s*((?:\\w+\\s*:\\s*)?${QUOTED_FRAGMENT})`;

class Variable extends Node {
  constructor(node, state) {
    if (typeof node === 'string') {
      node = { type: 'variable', value: node, match: [node, node] };
    }

    super(node);

    this.state = state;
    this.markup = node.markup || this.match[2] || this.value;
    this.name = null;
    this.options = { error_mode: Dry.Template.error_mode };
    // this.line_number   = this.state.loc.line;

    strict_parse_with_error_mode_fallback(this, this.markup);
  }

  markup_context(markup) {
    return `in "{{${markup}}}"`;
  }

  lax_parse(markup) {
    this.filters = [];

    const match = MARKUP_WITH_QUOTED_FRAGMENT.exec(markup);
    if (!match) return;

    const [, name_markup, filter_markup] = match;
    this.name = Expression.parse(name_markup);

    const fmatch = FILTER_MARKUP_REGEX.exec(filter_markup);
    if (!fmatch) return;

    const filters = scan(fmatch[1], FILTER_PARSER).flat();
    for (const f of filters) {
      const fm = /^\s*(\w+)(.*)$/.exec(f);
      if (!fm) continue;
      const filtername = fm[1];
      const filterargs = scan(fm[2].trim(), FILTER_ARGS_REGEX).flat().slice(1);
      this.filters.push(this.parse_filter_expressions(filtername, filterargs));
    }
  }

  strict_parse(markup) {
    this.filters = [];

    try {
      const parser = new Parser(this.markup);
      this.parse_name(parser);
      this.parse_filters(parser);
      parser.accept('end_of_string');
    } catch (err) {
      if (process.env.DEBUG) console.error(err);
    }
  }

  parse_name(parser) {
    this.name = !parser.eos() ? Expression.parse(parser.expression()) : null;
  }

  parse_filters(parser) {
    while (!parser.eos() && parser.accept('pipe')) {
      const filtername = parser.consume('id');
      const filterargs = parser.accept('colon') ? this.parse_filterargs(parser) : [];
      this.filters.push(this.parse_filter_expressions(filtername, filterargs));
    }
  }

  parse_filterargs(parser) {
    const filterargs = [parser.argument()];
    while (parser.accept('comma')) filterargs.push(parser.argument());
    return filterargs;
  }

  parse_filter_expressions(filter_name, unparsed_args) {
    const filter_args = [];
    const keyword_args = new Map();

    unparsed_args.forEach(arg => {
      const match = arg.match(JUST_TAG_ATTRIBUTES);

      if (match) {
        keyword_args.set(match[1], Expression.parse(match[2]));
      } else {
        filter_args.push(Expression.parse(arg));
      }
    });

    return [filter_name, filter_args, keyword_args];
  }

  evaluate_filter_expressions(context, filter_args, filter_kwargs) {
    const parsed_args = filter_args.map(expr => context.evaluate(expr));

    if (filter_kwargs.size > 0) {
      const parsed_kwargs = {};

      for (const [key, expr] of filter_kwargs) {
        parsed_kwargs[key] = context.evaluate(expr);
      }

      parsed_args.push(parsed_kwargs);
    }

    return parsed_args;
  }

  render_variable(context) {
    let value = context.evaluate(this.name);

    for (const [filter_name, filter_args, filter_kwargs] of this.filters) {
      const args = this.evaluate_filter_expressions(context, filter_args, filter_kwargs);
      value = context.invoke(filter_name, value, ...args);

      if (value instanceof Error) {
        value = context.handle_error(value);
      }
    }

    return context.apply_global_filter(value);
  }

  render(context) {
    return this.render_variable(context);
  }

  is_disabled(_context) {
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
    return class extends Dry.ParseTreeVisitor {
      Parent = Variable;
      get children() {
        return [this.node.name, ...this.node.filters].flat(Infinity).filter(Boolean);
      }
    };
  }
}

module.exports = Variable;
