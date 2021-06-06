'use strict';

exports.markup_context = (markup = '') => `in "${markup.trim()}"`;

exports.parse_with_selected_parser = (tag, markup) => {
  switch (tag.options?.error_mode) {
    case 'strict': return exports.strict_parse_with_error_context(tag, markup);
    case 'lax': return tag.lax_parse(markup);
    case 'warn':
    default: {
      try {
        return exports.strict_parse_with_error_context(tag, markup);
      } catch (err) {
        if (err instanceof SyntaxError) {
          if (tag.state?.warnings) tag.state.warnings.push(err);
          return tag.lax_parse(markup);
        }
        throw err;
      }
    }
  }
};

exports.strict_parse_with_error_context = (tag, markup) => {
  try {
    return tag.strict_parse(markup);
  } catch (e) {
    if (e instanceof SyntaxError) {
      e.line_number    = tag.line_number;
      e.markup_context = exports.markup_context(markup);
      throw e;
    }
    throw e;
  }
};

exports.strict_parse_with_error_mode_fallback = (tag, markup) => {
  try {
    return exports.strict_parse_with_error_context(tag, markup);
  } catch (e) {
    if (e instanceof SyntaxError) {
      switch (tag.options?.error_mode) {
        case 'strict': throw e;
        case 'warn': {
          if (tag.state?.warnings) tag.state.warnings.push(e);
          break;
        }
      }
      return tag.lax_parse(markup);
    }
  }
};
