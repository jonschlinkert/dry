'use strict';

const Dry = require('../../..');

exports.syntax_error = (node, key, options) => {
  throw new Dry.SyntaxError(node.state.locale.t(`errors.syntax.${key}`, options));
};

exports.argument_error = (node, key, options) => {
  throw new Dry.ArgumentError(node.state.locale.t(`errors.argument.${key}`, options));
};
