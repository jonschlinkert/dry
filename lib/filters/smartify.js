'use strict';

const quotes = { '"': ['“', '”'], "'": ['‘', '’'] };

module.exports = (input = '', options = {}) => {
  const str = String(input);
  const tokens = [];

  let remaining = str;
  let consumed = '';
  let token;
  let prev;

  const eos = () => remaining === undefined || remaining === '';
  const scan = (regex, type = 'text') => {
    const match = regex.exec(remaining);
    if (match) {
      return { type, value: match[0], match };
    }
  };

  const consume = (value, len = value.length) => {
    remaining = remaining.slice(len);
    consumed += value;
    return value;
  };

  const wrap = (quote, str) => {
    const chars = quotes[quote];
    return `${chars[0]}${str}${chars[1]}`;
  };

  const push = token => {
    if (prev && prev.type === 'text' && token.type === 'text') {
      prev.value += token.value;
      consume(token.value);
      return;
    }

    if (token.type === 'quoted') {
      token.value = wrap(token.match[1], token.match[2]);
    }

    consume(token.value);
    tokens.push(token);
    prev = token;
  };

  while (!eos()) {

    /**
     * Escaped text
     */

    if ((token = scan(/^\\+/, 'escaped'))) {
      if (token.value.length % 2 === 1) token.value += consume(remaining[0]);
      token.type = 'text';
      push(token);
      continue;
    }

    /**
     * Quoted strings
     */

    if ((token = scan(/^(['"])((?:\\.|(?!\1).)*?)(\1)/, 'quoted'))) {
      push(token);
      continue;
    }

    /**
     * Text (anything not matched by previous scanners)
     */

    push(scan(/^([-_a-zA-Z0-9?!;.~@#^&*\s]+|.)/, 'text'));
  }

  return consumed.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
};
