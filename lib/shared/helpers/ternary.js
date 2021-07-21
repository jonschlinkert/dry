'use strict';

const Dry = require('../../Dry');
const ConditionalSyntax = /(?<tag>.*)\s+(?<condition>if|unless)\s+(?<expression>.+)/;

exports.parse = (markup, context) => {
  const match = ConditionalSyntax.exec(markup.trim());
  if (!match) return markup;

  const { condition, expression } = match.groups;
  const tag = condition === 'unless'
    ? Dry.Template.parse(`{% unless ${expression} %}true{% endunless %}`)
    : Dry.Template.parse(`{% if ${expression} %}true{% endif %}`);

  return tag.render_strict(context) !== '' ? match.groups.tag : false;
};
