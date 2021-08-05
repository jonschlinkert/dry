'use strict';

const Dry = require('../../..');

const create_error_context = (token, state) => {
  const { red } = require('ansi-colors');

  const match = token.match;
  const { start, end } = token.loc;

  const remaining = match.input;
  const consumed = state.source.slice(0, start.index).toString();

  const line_count = Math.min(5, end.line);
  const lines = consumed.split(Dry.regex.Newline).slice(-line_count);
  const last_line = lines[lines.length - 1];

  const pipe = '|';
  const len = String(end.line).length;
  const prefix = n => String(n).padEnd(len);
  const output = [];

  for (let i = 0; i < lines.length; i++) {
    output.push([prefix(end.line - line_count + i), pipe, lines[i]].join(' '));
  }

  const nindex = remaining.indexOf('\n');
  const append = nindex > -1 ? remaining.slice(0, Math.min(20, nindex)) : remaining.slice(0, 20);
  const tag = `{% ${token.match.slice(1, 3).join(' ').trim()}`;

  output[output.length - 1] += append;
  output[output.length - 1] = output[output.length - 1].split(token.value).join(tag + ' ' + red(token.match[3]));
  const caret = ' '.repeat(last_line.length + tag.length + 1) + '^';

  output.push([prefix(lines.length), pipe, caret].join(' '));
  return output.join('\n');
};

module.exports = create_error_context;
