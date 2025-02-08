
const assert = require('node:assert/strict');
const Dry = require('../..');
const { State } = Dry;

const new_tokenizer = (source, { state = new State(), start_line_number = null } = {}) => {
  return state.new_tokenizer(source, { start_line_number });
};

const tokenize = source => {
  const tokenizer = new_tokenizer(source);
  return tokenizer.tokens.filter(Boolean);
};

const tokenize_line_numbers = source => {
  const tokenizer    = new_tokenizer(source, { start_line_number: 1 });
  const line_numbers = [];
  let line_number;

  do {
    if (line_number) line_numbers.push(line_number);
    line_number = tokenizer.line_number;
  } while (tokenizer.shift());
  return line_numbers;
};

describe('tokenizer_test', () => {
  it('test_tokenize_strings', () => {
    assert.deepEqual([' '], tokenize(' '));
    assert.deepEqual(['hello world'], tokenize('hello world'));
  });

  it('test_tokenize_variables', () => {
    assert.deepEqual(['{{funk}}'], tokenize('{{funk}}'));
    assert.deepEqual([' ', '{{funk}}', ' '], tokenize(' {{funk}} '));
    assert.deepEqual([' ', '{{funk}}', ' ', '{{so}}', ' ', '{{brother}}', ' '], tokenize(' {{funk}} {{so}} {{brother}} '));
    assert.deepEqual([' ', '{{  funk  }}', ' '], tokenize(' {{  funk  }} '));
  });

  it('test_tokenize_blocks', () => {
    assert.deepEqual(['{%comment%}'], tokenize('{%comment%}'));
    assert.deepEqual([' ', '{%comment%}', ' '], tokenize(' {%comment%} '));

    assert.deepEqual([' ', '{%comment%}', ' ', '{%endcomment%}', ' '], tokenize(' {%comment%} {%endcomment%} '));
    assert.deepEqual(['  ', '{% comment %}', ' ', '{% endcomment %}', ' '], tokenize('  {% comment %} {% endcomment %} '));
  });

  it('test_calculate_line_numbers_per_token_with_profiling', () => {
    assert.deepEqual([1], tokenize_line_numbers('{{funk}}'));
    assert.deepEqual([1, 1, 1], tokenize_line_numbers(' {{funk}} '));
    assert.deepEqual([1, 2, 2], tokenize_line_numbers('\n{{funk}}\n'));
    assert.deepEqual([1, 1, 3], tokenize_line_numbers(' {{\n funk \n}} '));
  });
});

