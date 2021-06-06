'use strict';

exports.markup_context = (markup = '') => `in "${markup.trim()}"`;

exports.parse_with_selected_parser = (tag, markup) => {
  switch (tag.error_mode) {
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
  } catch (err) {
    if (err instanceof SyntaxError) {
      err.line_number    = tag.line_number;
      err.markup_context = exports.markup_context(markup);
      throw err;
    }
    throw err;
  }
};

exports.strict_parse_with_error_mode_fallback = (tag, markup) => {
  try {
    return exports.strict_parse_with_error_context(tag, markup);
  } catch (err) {
    if (err instanceof SyntaxError) {
      switch (tag.error_mode) {
        case 'strict': throw err;
        case 'warn': {
          if (tag.state?.warnings) tag.state.warnings.push(err);
          break;
        }
      }
      return tag.lax_parse(markup);
    }
  }
};
