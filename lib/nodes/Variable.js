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
// const MARKUP_WITH_QUOTED_FRAGMENT = r('m')`(${QUOTED_FRAGMENT})(.*)`;
const FILTER_ARGS_REGEX           = r`(?:${FILTER_ARGUMENT_SEPARATOR}|${ARGUMENT_SEPARATOR})\\s*((?:\\w+\\s*:\\s*)?${QUOTED_FRAGMENT})`;

const MarkupWithQuotedFragment = /("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|(?:[^\s,|'"]|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')+)(.*)/m;

class Variable extends Node {
  constructor(node, state, context) {
    if (typeof node === 'string') {
      node = { type: 'variable', value: node, match: [node, node] };
    }

    super(node);
    const [, left = '', markup, right = ''] = this.match;
    this.state = state;
    this.name = null;
    this.markup = node.markup || markup || this.value;

    this.trim_left = left.includes('-');
    this.trim_right = right.includes('-') || (!markup && this.trim_left);

    this.line_number = node.loc ? node.loc.line : null;
    strict_parse_with_error_mode_fallback(this, this.markup);
  }

  markup_context(markup) {
    return `in "{{${markup}}}"`;
  }

  lax_parse(markup) {
    this.filters = [];

    const match = MarkupWithQuotedFragment.exec(markup);
    if (!match) return;

    const [, name, rest] = match;
    this.name = Expression.parse(name);

    const filters_match = FILTER_MARKUP_REGEX.exec(rest);
    if (!filters_match) return;

    scan(filters_match[1], FILTER_PARSER, str => {
      const filter = /^\s*(\w+)(.*)$/.exec(str);
      if (!filter) return;
      const filtername = filter[1];
      const filterargs = [];

      scan(filter[2].trim(), FILTER_ARGS_REGEX, (match, $1) => {
        filterargs.push($1);
      });

      this.filters.push(this.parse_filter_expressions(filtername, filterargs));
    });
  }

  strict_parse(markup) {
    this.filters = [];
    const p = new Parser(this.markup);
    this.name = Expression.parse(p.expression());

    while (!p.eos() && p.accept('pipe')) {
      const filtername = p.consume('id');
      const filterargs = p.accept('colon') ? this.parse_filterargs(p) : [];
      this.filters.push(this.parse_filter_expressions(filtername, filterargs));
    }

    p.consume('end_of_string');
  }

  parse_filterargs(p) {
    const filterargs = [p.argument()];
    while (p.accept('comma')) filterargs.push(p.argument());
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

  parse_whitespace(next = this.next) {
    if (this.trim_left && this.prev) {
      this.prev.value = this.prev.value.trimEnd();
    }

    if (this.trim_right && next) {
      next.value = next.value.trimStart();
    }
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

  evaluate(context) {
    return this.render_variable(context);
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
