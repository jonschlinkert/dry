'use strict';

const { r } = require('../utils');

exports.PROTECTED_KEYS = new Set(Reflect.ownKeys(Object).concat(['constructor', '__proto__', 'inspect']));

const ARGUMENT_SEPARATOR            = ',';
const FILTER_ARGUMENT_SEPARATOR     = ':';
const TAG_START                     = '{%';
const VAR_START                     = '{{';
const VARIABLE_ATTRIBUTE_SEPARATOR  = '.';
const WHITESPACE_CONTROL            = '-';

const FILTER_SEPARATOR              = /\|/;
const LIQUID_TAG_REGEX              = /^\s*(\w+)\s*(.*?)$/;
const QUOTED_STRING                 = /"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/;
const TAG_END_REGEX                 = /%}/;
const TAG_START_REGEX               = /{%/;
const VARIABLE_END                  = /}}/;
const VARIABLE_INCOMPLETE_END       = /}}?/;
const VARIABLE_SEGMENT              = /[\w-]/;
const VARIABLE_SIGNATURE            = /(?:\([\w-.[\]]\)|[\w-.[\]])/;
const VARIABLE_START                = /{{/;
const WHITESPACE_REGEX              = /^\s+$/;
const QUOTED_FRAGMENT               = r`(?:${QUOTED_STRING}|(?:[^\\s,|'"]|${QUOTED_STRING})+)`;
const TAG_ATTRIBUTES                = r`(\\w+)\\s*:\\s*(${QUOTED_FRAGMENT})`;
const ANY_STARTING_TAG              = r`${TAG_START_REGEX}|${VARIABLE_START}`;
const PARTIAL_TEMPLATE_PARSER       = r('m')`${TAG_START_REGEX}.*?${TAG_END_REGEX}|${VARIABLE_START}.*?${VARIABLE_INCOMPLETE_END}`;
const TEMPLATE_REGEX                = r('m')`(${PARTIAL_TEMPLATE_PARSER}|${ANY_STARTING_TAG})`;
const VARIABLE_PARSER               = r`\\[[^\\]]+\\]|${VARIABLE_SEGMENT}+\\??`;

const TAG_REGEX = r('m')`^${TAG_START_REGEX}${WHITESPACE_CONTROL}?(\\s*)(\\w+)(\\s*)(.*?)${WHITESPACE_CONTROL}?${TAG_END_REGEX}$`;
const VARIABLE_REGEX = r('m')`^${VARIABLE_START}${WHITESPACE_CONTROL}?\\s*(.*?)\\s*${WHITESPACE_CONTROL}?${VARIABLE_END}$`;

exports.regex = {
  // special
  REGEX_BOM: /^\ufeff/,
  REGEX_ESCAPED: /^\\+/,

  // operators and builtins
  REGEX_OPERATOR: /^(===?|!==?|<>|>=?|<=?|(?:and|contains|or))(?=\s)/,
  REGEX_PROPERTY: /^(?:\.(size|first|last|blank|empty|nil|present))/,

  // literals
  REGEX_LITERAL: /^(['"`])((?:\\.|(?!\1)[\s\S])*?)(\1)/,
  REGEX_SINGLE_QUOTED_STRING: /^'((?:\\.|[^'])*)'$/,
  REGEX_DOUBLE_QUOTED_STRING: /^"((?:\\.|[^"])*)"$/,

  REGEX_COMMENT_OPEN: /^{#-?/,
  REGEX_COMMENT_CLOSE: /^-?#}/,

  REGEX_BASIC_TAG: /^{%\s*(end)?(raw|comment)\s*%}/,
  REGEX_TAG_OPEN: /^{%([=-]*)/,
  REGEX_TAG_CLOSE: /^([=-]*)%}/,

  REGEX_VARIABLE_OPEN: /^{{{*([=-]*)/,
  REGEX_VARIABLE_CLOSE: /^([=-]*)}}}*/,

  // spaces
  REGEX_NEWLINE: /^\r*\n+|\r+/,
  REGEX_NON_NEWLINE_SPACE: /^[^\S\n\r]+/,
  REGEX_SPACE: /^\s+/,

  REGEX_RANGE: /^(?:([^"'\s.(]+)\s*\.{2}\s*([^\s)"']+))/,
  REGEX_IDENT: /^\(([^\\.)]*(?:\\.[^\\.)]*)*)\)/,
  REGEX_IDENTIFIER: /^(?:[@$]|(end|els))?[_a-zA-Z](?:[_a-zA-Z0-9_.-](?!\.)|[_a-zA-Z0-9_-])*/,
  REGEX_NUMBER: /^\s*([0-9]+(\.[0-9]+)?)/,
  // REGEX_TEXT: /^[_a-zA-Z0-9$<>;,`/!@#^&*+= -.]+/,
  REGEX_TEXT: /^[^\s{%}]+/,
  REGEX_DOTDOT: /^[.]{2}(?![.])/,

  ANY_STARTING_TAG,
  ARGUMENT_SEPARATOR,
  FILTER_ARGUMENT_SEPARATOR,
  FILTER_SEPARATOR,
  LIQUID_TAG_REGEX,
  PARTIAL_TEMPLATE_PARSER,
  QUOTED_FRAGMENT,
  QUOTED_STRING,
  TAG_ATTRIBUTES,
  TAG_END_REGEX,
  TAG_REGEX,
  TAG_START,
  TAG_START_REGEX,
  TEMPLATE_REGEX,
  VAR_START,
  VARIABLE_ATTRIBUTE_SEPARATOR,
  VARIABLE_END,
  VARIABLE_INCOMPLETE_END,
  VARIABLE_PARSER,
  VARIABLE_REGEX,
  VARIABLE_SEGMENT,
  VARIABLE_SIGNATURE,
  VARIABLE_START,
  WHITESPACE_CONTROL,
  WHITESPACE_REGEX
};

exports.chars =  {
  '.': 'dot',
  '|': 'pipe',
  ',': 'comma',
  ':': 'colon',
  '{': 'brace_open',
  '}': 'brace_close',
  '[': 'bracket_open',
  ']': 'bracket_close',
  '(': 'paren_open',
  ')': 'paren_close'
};
