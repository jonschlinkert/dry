'use strict';

exports.get_block_name = (tag_name, markup) => {
  if (markup.trim() === '') {
    throw new SyntaxError(`${tag_name} requires a name, eg. {% ${tag_name} sidebar %}`);
  } else {
    return markup.trim();
  }
};

// Gets the storage space for the content block
exports.get_block = (context, block) => {
  context.environments[0]['content_for'] ||= {};
  context.environments[0]['content_for'][block] ||= [];
};

exports.render = (context, block) => {
  return exports.get_block(context, block).join('');
};

exports.append_to_block = (context, block, content) => {
  const converter = context.environments[0]['converter'];
  content = converter.convert(content).replace(/\n$/, '');
  return exports.get_block(context, block) + content;
};

