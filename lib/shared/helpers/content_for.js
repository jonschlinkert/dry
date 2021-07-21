'use strict';

exports.get_block = (context, block) => {
  context.environments[0]['content_for'] ||= {};
  context.environments[0]['content_for'][block] ||= [];
  return context.environments[0]['content_for'][block];
};

exports.render = (context, block) => {
  return exports.get_block(context, block).join('');
};

exports.append_to_block = (context, block, content = '') => {
  const converter = context.environments[0]['converter'];
  const output = converter.convert(content).replace(/\n$/, '');
  return exports.get_block(context, block) + output;
};

