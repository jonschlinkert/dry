/* eslint-disable no-useless-call */
'use strict';

const Dry = require('../Dry');

exports.markup_context = (node, markup = '') => {
  return node.markup_context ? node.markup_context(markup) : `in "${markup.trim()}"`;
};

exports.parse_with_selected_parser = (node, markup) => {
  switch (node.error_mode) {
    case 'strict': return exports.strict_parse_with_error_context(node, markup);
    case 'lax': return node.lax_parse(markup);
    case 'warn':
    default: {
      try {
        return exports.strict_parse_with_error_context(node, markup);
      } catch (err) {
        if (err instanceof Dry.SyntaxError) {
          if (node.state?.warnings) node.state.warnings.push(err);
          return node.lax_parse.call(node, markup);
        }
        throw err;
      }
    }
  }
};

exports.strict_parse_with_error_context = (node, markup) => {
  try {
    return node.strict_parse(markup);
  } catch (err) {
    if (err instanceof Dry.SyntaxError) {
      err.line_number    = node.line_number;
      err.markup_context = exports.markup_context(node, markup);
    }
    throw err;
  }
};

exports.strict_parse_with_error_mode_fallback = (node, markup) => {
  try {
    return exports.strict_parse_with_error_context(node, markup);
  } catch (err) {
    if (err instanceof Dry.SyntaxError) {
      switch (node.error_mode) {
        case 'strict': throw err;
        case 'warn': {
          if (node.state?.warnings) node.state.warnings.push(err);
          break;
        }
      }
      return node.lax_parse.call(node, markup);
    }
  }
};
