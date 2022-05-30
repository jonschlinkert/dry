'use strict';

const Dry = require('../../Dry');
const ConditionalSyntax = /^(?<tag>.*?)\s+(?<condition>if|unless)\s+(?<expression>.+)/;
const TernarySyntax = /^\(?([^\s?]+)\s*\?\s*([^\s:]+)\s*:\s*(.*?)\)?$/;

exports.isTernary = input => {
  return ConditionalSyntax.test(input.trim()) || TernarySyntax.test(input.trim());
};

exports.parse = async (markup, context) => {
  const conditional = ConditionalSyntax.exec(markup.trim());
  if (conditional) {
    const { condition, expression } = conditional.groups;
    const tag = condition === 'unless'
      ? Dry.Template.parse(`{% unless ${expression} %}true{% endunless %}`)
      : Dry.Template.parse(`{% if ${expression} %}true{% endif %}`);

    return tag;
  }

  const ternary = TernarySyntax.exec(markup.trim());
  if (ternary) {
    const [, a, b, c] = ternary;
    return Dry.Template.parse(`{% if ${a} %}{{ ${b} }}{% else %}{{ ${c} }}{% endif %}`);
  }

  return markup;
};
