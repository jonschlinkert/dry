'use strict';

const { r } = require('../shared/utils');

const FilterSeparator            = /\|/;
const ArgumentSeparator          = ',';
const FilterArgumentSeparator    = ':';
const VarStart                   = '{{';
const VariableAttributeSeparator = '.';
const WhitespaceControl          = '-';
const TagStart                   = /{%/;
const TagEnd                     = /%}/;
const VariableSignature          = /(?:\((@?[\w-.[\]]+)\)|(@?[\w-.[\]]+))/;
const VariableSegment            = /(?:[\w-]|,\s*)/;
const VariableStart              = /{{/;
const VariableEnd                = /}}/;
const VariableIncompleteEnd      = /}}?/;
const QuotedString               = /^`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/;
const QuotedFragment             = r('g')`(?:${QuotedString}|(?:[^\\s,(|'"]|${QuotedString})+)`;
const TagAttributes              = r`(\\w+)\\s*:\\s*(${QuotedFragment})`;
const AnyStartingTag             = r`${TagStart}|${VariableStart}`;
const PartialTemplateParser      = r('m')`${TagStart}[\\s\\S]*?${TagEnd}|${VariableStart}[\\s\\S]*?${VariableIncompleteEnd}`;
const TemplateRegex              = r`(${PartialTemplateParser}|${AnyStartingTag})`;
const VariableParser             = r('g')`(?:\\[[^\\]]+\\]|!* *@?${VariableSegment}+\\??(?:\\([\\s\\S]*?\\))?)`;

// custom
const TernarySyntax              = /(?<markup>.*?)\(\s*(?<condition>.+?)\s+\?\s+(?<truthy>.+?)\s+:\s+(?<falsey>.+?)\s*\)(?<other>.+)?/;
const FiltersSyntax              = /(?<markup>.*?)(?<filters>(^|[^|])\|\s+.+)/;

const regex = {
  ArgumentSeparator,
  FilterArgumentSeparator,
  FilterSeparator,
  QuotedFragment,
  QuotedString,
  TagAttributes,
  TagEnd,
  TagStart,
  TemplateRegex,
  VarStart,
  VariableAttributeSeparator,
  VariableEnd,
  VariableParser,
  VariableSegment,
  VariableSignature,
  VariableStart,
  WhitespaceControl,
  FiltersSyntax,
  TernarySyntax
};

module.exports = regex;
