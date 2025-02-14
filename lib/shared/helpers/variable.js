
const Dry = require('../../Dry');
const { shared: { helpers }, regex: { FiltersSyntax, TernarySyntax }, utils } = Dry;
const { setImmediate } = require('node:timers/promises');

const MAX_RECURSION_DEPTH = 100;
const visitedReferences = new WeakMap();

exports.set_line_number = (node, state) => {
  if (utils.isObject(node) && node.line_number === undefined && state && state.loc) {
    if (state.loc.line) {
      node.line_number = state.loc.line - 1;
    } else if (state.loc.start) {
      node.line_number = state.loc.start.line - 1;
    }
  }
};

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

  const varArray = vars.split(/ (\|\||or) /).map(v => context[v.trim()] !== null).filter(v => v !== undefined);

  if (varArray.length === 0) return;

  const variable = varArray[0];

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

  const varArray = vars.split(/ \|\| /).map(v => {
    if (!utils.isNil(context[v.trim()])) return v;
  }).filter(v => v !== undefined);

  if (utils.empty(varArray)) return;

  if (filters) {
    return Dry.Template.parse('{{ ' + varArray[0] + filters + ' }}').render(context);
  }

  return context[varArray[0]];
};

exports.parse_expression = (expression, node) => {
  const expr = Dry.Expression.parse(expression);

  if (node && expr instanceof Dry.VariableLookup) {
    Reflect.defineProperty(expr, 'parent', { value: node });
  }

  return expr;
};

exports.parse_variable_strict = (input = '', variable = {}) => {
  const markup = input.trim();

  const parser = new Dry.expressions.Parser(markup, variable);
  const name = exports.parse_expression(parser.expression());

  if (name instanceof Dry.VariableLookup) {
    Reflect.defineProperty(name, 'parent', { value: variable });
  }

  const filters = [];
  const results = { name, macro_args: [], filters };

  if (variable && variable.state.line_numbers === true) {
    exports.set_line_number(results.name, variable);
  }

  if (!parser.eos() && parser.look('open_round')) {
    results.macro_call = true;
    results.macro_args = exports.parse_arguments(parser.expression(), variable);
  }

  if (variable.is_assignment && !parser.eos() && parser.look('open_square')) {
    results.array_literal = true;
    results.array = parser.expression();
  }

  while (!parser.eos() && parser.accept('pipe')) {
    const filtername = parser.consume('id');
    const filterargs = parser.accept('colon') ? exports.parse_filterargs(parser) : [];
    filters.push(exports.parse_filter_expressions(filtername, filterargs, variable));
  }

  parser.consume('end_of_string');
  return results;
};

//
// Parses variable arguments and filters
//
exports.parse_variable_lax = (markup, node) => {
  const match = Dry.Variable.MarkupWithQuotedFragment.exec(markup);
  if (!match) return;

  const [, varname, r] = match;
  let rest = r.trim();

  const name = Dry.Expression.parse(varname);
  const filters = [];
  const results = { name, filters };

  if (rest && rest.startsWith('(') && rest.includes(')')) {
    const index = rest.indexOf(')');
    const args_string = rest.slice(1, index);
    results.macro_call = true;
    results.macro_args = exports.parse_arguments(args_string, node);
    rest = rest.slice(index + 1);
  }

  if (rest && rest.startsWith('[') && rest.includes(']')) {
    const index = rest.indexOf(']');
    const args_string = rest.slice(1, index);
    results.array_literal = true;
    results.array = exports.parse_arguments(args_string, node);
    rest = rest.slice(index + 1);
  }

  const filters_match = Dry.Variable.FilterMarkupRegex.exec(rest);
  if (!filters_match) return results;

  utils.scan(filters_match[1], Dry.Variable.FilterParser, str => {
    const filter = Dry.Variable.FilterPropertyRegex.exec(str);

    if (!filter) return;
    const filtername = filter[1];
    const filterargs = [];

    utils.scan(filter[2].trim(), Dry.Variable.FilterArgsRegex, (match, $1, $2) => {
      if ($2 && $1) {
        filterargs.push({ [$1]: $2 });
        return;
      }

      filterargs.push($1);
    });

    filters.push(exports.parse_filter_expressions(filtername, filterargs, node));
  });

  return results;
};

exports.parse_filters = markup => {
  const regex = utils.r`${Dry.regex.FilterSeparator}\\s*(.*)`;
  const match = regex.exec(markup);
  const filters = [];

  if (match) {
    utils.scan(match[1], Dry.Variable.FilterParser, f => {
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

exports.parse_arguments = (markup, node) => {
  const parser = new Dry.expressions.Parser(markup);
  const args = [];

  while (!parser.eos()) {
    args.push(exports.parse_expression(parser.expression(), node));
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

exports.parse_filter_expressions = (filter_name, unparsed_args, node) => {
  const filterargs = [];
  const keywordargs = new Map();
  let args;

  const parse_arg = arg => {
    const match = arg.match(Dry.Variable.JustTagAttributes);

    if (match) {
      keywordargs.set(match[1], exports.parse_expression(match[2], node));
    } else {
      filterargs.push(exports.parse_expression(arg, node));
    }
  };

  for (const arg of unparsed_args) {
    if (typeof arg === 'string') {
      parse_arg(arg);
      continue;
    }

    if (utils.isObject(arg)) {
      for (const [key, value] of Object.entries(arg)) {
        args[exports.parse_expression(key, node)] = value;
      }
    }
  }

  if (args) {
    filterargs.push(args);
  }

  return [filter_name, filterargs, keywordargs];
};

/**
 * Evaluate
 */

exports.evaluate_filter_expressions = async (context, filter_args = [], filter_kwargs = []) => {
  const parsed_args = await Promise.all(filter_args.map(expr => context.evaluate(expr)));

  if (filter_kwargs.size > 0) {
    const parsed_kwargs = {};

    for (const [key, expr] of filter_kwargs) {
      parsed_kwargs[key] = await context.evaluate(expr);
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
  }
  return markup;
};

/**
 * Render
 */

exports.render_array = async (array_args = [], context) => {
  const result = [];

  for (const variable of array_args) {
    const value = await context.evaluate(variable);

    if (variable.spread && Array.isArray(value)) {
      result.push(...value);
    } else {
      result.push(value);
    }
  }

  return result;
};

exports.render_block = async (node, args = [], context) => {
  const [name, filepath] = args;
  let block;

  if (filepath) {
    const template_name = await context.evaluate(filepath);
    if (!template_name) helpers.raise.argument_error(node, 'include');

    const partial = Dry.PartialCache.load(template_name, { context });
    block = partial.state.get_block(name);
  } else {
    block = context.state.get_block(name);
  }

  return block.render_inner(context);
};

exports.render_macro = async (node, variable_lookup, macro_args = [], context) => {
  await setImmediate();

  const { name } = variable_lookup;
  const macro = await context.evaluate(variable_lookup) || node.parent.macros[name];
  if (!macro && name?.markup === 'block') return exports.render_block(node, macro_args, context);
  if (!macro || !(macro instanceof Dry.tags.Macro)) return '';

  const locals = {};
  const args = [];
  let output = '';

  // spread syntax: ...args
  for (const macro_arg of macro_args) {
    if (macro_arg && macro_arg.spread === true) {
      args.push(...await context.evaluate(macro_arg));
    } else {
      args.push(macro_arg);
    }
  }

  for (let index = 0; index < macro.params.length; index++) {
    const { param, fallback } = macro.params[index];
    const variable = await utils.resolve(args[index], context);
    const value = await context.evaluate(variable);
    locals[param.name] = value ?? await context.evaluate(fallback);
  }

  await context.stack(locals, async () => {
    output = await macro.render_inner(context);
  });

  return output;
};

// exports.render_variable = async (name, filters = [], context) => {
//   let recursionDepth = 0;

//   const checkRecursion = variable => {
//     if (recursionDepth > MAX_RECURSION_DEPTH) {
//       throw new Dry.Error('Maximum recursion depth exceeded in variable reference');
//     }

//     if (visitedReferences.has(variable)) {
//       throw new Dry.Error('Circular reference detected in variable');
//     }

//     visitedReferences.set(variable, true);
//     recursionDepth++;
//   };

//   const clearRecursionState = variable => {
//     visitedReferences.delete(variable);
//     recursionDepth--;
//   };

//   try {
//     checkRecursion(name);
//     const value = await context.evaluate(name);
//     clearRecursionState(name);
//     return exports.apply_filters(value, filters, context);
//   } catch (error) {
//     clearRecursionState(name);
//     throw error;
//   }
// };

exports.render_variable = async (name, filters = [], context) => {
  return exports.apply_filters(await context.evaluate(name), filters, context);
};

// exports.apply_filters = async (value, filters = [], context) => {
//   const appliedFilters = new Set();

//   for (const [filter_name, filter_args, filter_kwargs] of filters) {
//     if (appliedFilters.has(filter_name)) {
//       throw new Dry.Error(`Filter "${filter_name}" applied multiple times in chain`);
//     }

//     appliedFilters.add(filter_name);
//     const args = await exports.evaluate_filter_expressions(context, filter_args, filter_kwargs);

//     try {
//       value = await context.invoke(await filter_name, value, ...args);
//     } catch (error) {
//       throw new Dry.Error(`Error applying filter: ${error.message}`);
//     }

//     if (value instanceof Dry.Error) {
//       value = context.handle_error(value);
//     }
//   }

//   appliedFilters.clear();
//   return context.apply_global_filter(value);
// };

exports.apply_filters = async (value, filters = [], context) => {
  for (const [filter_name, filter_args, filter_kwargs] of filters) {
    const args = await exports.evaluate_filter_expressions(context, filter_args, filter_kwargs);
    value = await context.invoke(await filter_name, value, ...args);

    if (value instanceof Dry.Error) {
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
  const appliedFilters = new Set();

  return filters.reduce((output, filter) => {
    const filterargs = [];
    const keywordargs = {};
    const filterName = filter[0];

    if (appliedFilters.has(filterName)) {
      throw new Dry.Error(`Filter "${filterName}" applied multiple times`);
    }

    appliedFilters.add(filterName);

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
      output = context.invoke(filterName, output, ...filterargs);
    } catch (err) {
      throw new Dry.Error(`Error - filter '${filterName}' could not be found.`);
    }

    return output;
  }, content);
};
