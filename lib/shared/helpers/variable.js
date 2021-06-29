'use strict';

const Dry = require('../../Dry');

const TernarySyntax = /(?<markup>.*?)\(\s*(?<condition>.+?)\s+\?\s+(?<truthy>.+?)\s+:\s+(?<falsey>.+?)\s*\)(?<other>.+)?/;
const FiltersSyntax = /(?<markup>.*?)(?<filters>(^|[^|])\|\s+.+)/;

exports.set_value = (key, operator, value, context) => {
  const existing = context.get(key);

  if (existing == null) {
    context.set(key, value);
  } else if (operator === '+=') {
    context.set(key, existing + value);
  } else if (operator === '-=') {
    context.set(key, existing - value);
  }

  return context;
};

exports.get_value = (variables, context) => {
  let vars = exports.evaluate_ternary(variables, context).trim();
  let filters = false;

  const matched = vars.trim().match(FiltersSyntax);

  if (matched) {
    vars = matched.groups['markup'];
    filters = matched.groups['filters'];
  }

  vars = vars.split(/ (\|\||or) /).map(v => context[v.trim()] !== null).filter(v => v !== undefined);

  if (vars.length === 0) return;

  const variable = vars[0];

  if (filters) {
    return Dry.Template.parse(`{{ ${variable + filters} }}`).render(context);
  }

  return context[variable];
};

exports.get_value2 = (vars, context) => {
  vars = exports.evaluate_ternary(vars, context);
  vars = vars.trim().replace(/ or /g, ' || ');

  let filters = false;

  const matched = FiltersSyntax.exec(vars.trim());

  if (matched) {
    filters = matched['filters'];
    vars = matched['markup'];
  }

  vars = vars.split(/ \|\| /).map(v => {
    if (!Dry.utils.isNil(context[v.trim()])) return v;
  }).filter(v => v !== undefined);

  if (Dry.utils.empty(vars)) return;

  if (filters) {
    return Dry.Template.parse('{{ ' + vars[0] + filters + ' }}').render(context);
  }

  return context[vars[0]];
};

exports.parse_variable_strict = markup => {
  const filters = [];
  const parser = new Dry.expressions.Parser(markup);
  const name = exports.parse_expression(parser.expression());

  while (!parser.eos() && parser.accept('pipe')) {
    const filtername = parser.consume('id');
    const filterargs = parser.accept('colon') ? exports.parse_filterargs(parser) : [];
    filters.push(exports.parse_filter_expressions(filtername, filterargs));
  }

  parser.consume('end_of_string');
  return { name, filters };
};

// Parses variable arguments and filters
//
exports.parse_variable_lax = markup => {
  const match = Dry.Variable.MarkupWithQuotedFragment.exec(markup);
  if (!match) return;

  const [, varname, r] = match;
  const rest = r.trim();

  const name = Dry.Expression.parse(varname);
  const filters = [];
  const results = { name, filters };

  if (rest && rest.startsWith('(') && rest.endsWith(')')) {
    results.name.macro = true;
    results.macro_call = true;
    results.macro_args = exports.parse_arguments(rest.slice(1, -1));
    return results;
  }

  if (rest && rest.startsWith('[') && rest.endsWith(']')) {
    results.array_literal = true;
    results.array = exports.parse_arguments(rest.slice(1, -1));
    return results;
  }

  const filters_match = Dry.Variable.FilterMarkupRegex.exec(rest);
  if (!filters_match) return results;

  Dry.utils.scan(filters_match[1], Dry.Variable.FilterParser, str => {
    const filter = Dry.Variable.FilterPropertyRegex.exec(str);
    if (!filter) return;
    const filtername = filter[1];
    const filterargs = [];

    Dry.utils.scan(filter[2].trim(), Dry.Variable.FilterArgsRegex, (match, $1) => {
      filterargs.push($1);
    });

    filters.push(exports.parse_filter_expressions(filtername, filterargs));
  });

  return results;
};

exports.parse_filters = markup => {
  const regex = Dry.utils.r`${Dry.regex.FilterSeparator}\\s*(.*)`;
  const match = regex.exec(markup);
  const filters = [];

  if (match) {
    Dry.utils.scan(match[1], Dry.Variable.FilterParser, f => {
      const matches = f.match(/\s*(\w+)/);
      if (matches) {
        const filtername = matches[1];
        const filterargs = f.match(Dry.Variable.FilterArgsRegex);
        filters.push([filtername, filterargs]);
      }
    });
  }

  return filters;
};

exports.parse_arguments = markup => {
  const parser = new Dry.expressions.Parser(markup);
  const args = [];

  while (!parser.eos()) {
    args.push(exports.parse_expression(parser.expression()));
    parser.accept('comma');
  }

  parser.consume('end_of_string');
  return args;
};

exports.parse_filterargs = parser => {
  const filterargs = [parser.argument()];
  while (parser.accept('comma')) filterargs.push(parser.argument());
  return filterargs;
};

exports.parse_filter_expressions = (filter_name, unparsed_args) => {
  const filterargs = [];
  const keywordargs = new Map();

  unparsed_args.forEach(arg => {
    const match = arg.match(Dry.Variable.JustTagAttributes);

    if (match) {
      keywordargs.set(match[1], exports.parse_expression(match[2]));
    } else {
      filterargs.push(exports.parse_expression(arg));
    }
  });

  return [filter_name, filterargs, keywordargs];
};

exports.parse_expression = expression => {
  return Dry.Expression.parse(expression);
};

/**
 * Evaluate
 */

exports.evaluate_filter_expressions = (context, filter_args = [], filter_kwargs = []) => {
  const parsed_args = filter_args.map(expr => context.evaluate(expr));

  if (filter_kwargs.size > 0) {
    const parsed_kwargs = {};

    for (const [key, expr] of filter_kwargs) {
      parsed_kwargs[key] = context.evaluate(expr);
    }

    parsed_args.push(parsed_kwargs);
  }

  return parsed_args;
};

exports.evaluate_ternary = (markup, context) => {
  const matched = markup.trim().match(TernarySyntax);
  if (matched) {
    const condition = Dry.Template.parse(`{% if ${matched['condition']} %}true{% endif %}`);
    const conditional = condition.render_strict(context) !== '' ? matched['truthy'] : matched['falsey'];
    return `${matched['markup']} ${conditional} ${matched['other']}`;
  } else {
    return markup;
  }
};

/**
 * Render
 */

exports.render_array = (array_args = [], context) => {
  const result = [];

  for (const variable of array_args) {
    const value = context.evaluate(variable);

    if (variable.spread && Array.isArray(value)) {
      result.push(...value);
    } else {
      result.push(value);
    }
  }

  return result;
};

exports.render_block = async (args = [], context) => {
  const [name, filepath] = args;
  let block;

  if (filepath) {
    const template_name = context.evaluate(filepath);
    if (!template_name) throw new Dry.ArgumentError(this.state.locale.t('errors.argument.include'));

    const partial = Dry.PartialCache.load(template_name, { context });
    block = partial.state.get_block(name);
  } else {
    block = context.state.get_block(name);
  }

  return block.render_inner(context);
};

exports.render_macro = async (name, macro_args = [], context) => {
  const macro = context.evaluate(name);

  if (!macro && name && name.markup === 'block') return exports.render_block(macro_args, context);
  if (!macro || !(macro instanceof Dry.tags.Macro)) return '';

  const locals = {};
  const args = [];
  let output = '';

  // spread syntax: ...args
  for (const macro_arg of macro_args) {
    if (macro_arg && macro_arg.spread === true) {
      args.push(...context.evaluate(macro_arg));
    } else {
      args.push(macro_arg);
    }
  }

  for (let index = 0; index < macro.params.length; index++) {
    const { param, fallback } = macro.params[index];
    const variable = args[index];
    const value = context.evaluate(variable);
    locals[param.name] = value ?? context.evaluate(fallback);
  }

  await context.stack(locals, async () => {
    output = await macro.render_inner(context);
  });

  return output;
};

exports.render_variable = (name, filters = [], context) => {
  let value = context.evaluate(name);

  for (const [filter_name, filter_args, filter_kwargs] of filters) {
    const args = exports.evaluate_filter_expressions(context, filter_args, filter_kwargs);
    value = context.invoke(filter_name, value, ...args);

    if (value instanceof Error) {
      value = context.handle_error(value);
    }
  }

  return context.apply_global_filter(value);
};

// Passes input through Liquid filters
//
// content - a string to be parsed
// filters - a series of liquid filters e.g. "| upcase | replace:'a','b'"
// context - the current Liquid context object
//
// Returns a filtered string
//
exports.render_filters = (content, markup, context) => {
  if (content == null) return '';

  const { filters = [] } = exports.parse_variable_lax(markup);

  return filters.reduce((output, filter) => {
    const filterargs = [];
    const keywordargs = {};
    for (const a of [].concat(filter[1])) {
      const match = a.match(new RegExp(`^${Dry.TagAttributes}$`));
      if (match) {
        keywordargs[match[1]] = context[match[2]];
      } else {
        filterargs.push(context[a]);
      }
    }
    if (keywordargs.length > 0) {
      filterargs.push(...keywordargs);
    }
    try {
      output = context.invoke(filter[0], output, ...filterargs);
    } catch (err) {
      throw new Dry.Error(`Error - filter '${filter[0]}' could not be found.`);
    }
  }, content);
};
