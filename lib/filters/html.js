'use strict';

const { REGEX_HTML_TAGS } = require('../constants');
const { toString } = require('../utils');

const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&#34;',
  "'": '&#39;'
};

const unescapeMap = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#34;': '"',
  '&#39;': "'"
};

const esc = input => {
  return toString(input).replace(/&|<|>|"|'/g, m => escapeMap[m]);
};

const unesc = input => {
  return String(input).replace(/&(amp|lt|gt|#34|#39);/g, m => unescapeMap[m]);
};

module.exports = {
  escape: esc,
  escape_once: input => esc(unesc(input)),
  newline_to_br: input => input.replace(/\n/g, '<br>'),
  strip_html: input => input.replace(REGEX_HTML_TAGS, '')
};
