'use strict';

const { assert_template_result } = require('../../test_helpers');
const Dry = require('../../..');

class ArrayDrop extends Dry.Drop {
  constructor(array) {
    super();
    this.array = array;
  }

  each(block) {
    this.array.forEach(block);
  }
}

describe('table_row_test', () => {
  it('test_table_row', async () => {
    await assert_template_result('<tr class="row1">\n<td class="col1"> 1 </td><td class="col2"> 2 </td><td class="col3"> 3 </td></tr>\n<tr class="row2"><td class="col1"> 4 </td><td class="col2"> 5 </td><td class="col3"> 6 </td></tr>\n', '{% tablerow n in numbers cols:3%} {{n}} {% endtablerow %}', { numbers: [1, 2, 3, 4, 5, 6] });

    await assert_template_result('<tr class="row1">\n</tr>\n', '{% tablerow n in numbers cols:3%} {{n}} {% endtablerow %}', { numbers: [] });
  });

  it('test_table_row_with_different_cols', async () => {
    await assert_template_result('<tr class="row1">\n<td class="col1"> 1 </td><td class="col2"> 2 </td><td class="col3"> 3 </td><td class="col4"> 4 </td><td class="col5"> 5 </td></tr>\n<tr class="row2"><td class="col1"> 6 </td></tr>\n',
      '{% tablerow n in numbers cols:5%} {{n}} {% endtablerow %}',
      { numbers: [1, 2, 3, 4, 5, 6] });
  });

  it('test_table_col_counter', async () => {
    await assert_template_result('<tr class="row1">\n<td class="col1">1</td><td class="col2">2</td></tr>\n<tr class="row2"><td class="col1">1</td><td class="col2">2</td></tr>\n<tr class="row3"><td class="col1">1</td><td class="col2">2</td></tr>\n',
      '{% tablerow n in numbers cols:2%}{{tablerowloop.col}}{% endtablerow %}',
      { numbers: [1, 2, 3, 4, 5, 6] });
  });

  it('test_QuotedFragment', async () => {
    await assert_template_result('<tr class="row1">\n<td class="col1"> 1 </td><td class="col2"> 2 </td><td class="col3"> 3 </td></tr>\n<tr class="row2"><td class="col1"> 4 </td><td class="col2"> 5 </td><td class="col3"> 6 </td></tr>\n',
      '{% tablerow n in collections.frontpage cols:3%} {{n}} {% endtablerow %}',
      { collections: { frontpage: [1, 2, 3, 4, 5, 6] } });
    await assert_template_result('<tr class="row1">\n<td class="col1"> 1 </td><td class="col2"> 2 </td><td class="col3"> 3 </td></tr>\n<tr class="row2"><td class="col1"> 4 </td><td class="col2"> 5 </td><td class="col3"> 6 </td></tr>\n',
      "{% tablerow n in collections['frontpage'] cols:3%} {{n}} {% endtablerow %}",
      { collections: { frontpage: [1, 2, 3, 4, 5, 6] } });
  });

  it('test_enumerable_drop', async () => {
    await assert_template_result('<tr class="row1">\n<td class="col1"> 1 </td><td class="col2"> 2 </td><td class="col3"> 3 </td></tr>\n<tr class="row2"><td class="col1"> 4 </td><td class="col2"> 5 </td><td class="col3"> 6 </td></tr>\n',
      '{% tablerow n in numbers cols:3%} {{n}} {% endtablerow %}',
      { numbers: new ArrayDrop([1, 2, 3, 4, 5, 6]) });
  });

  it('test_offset_and_limit', async () => {
    await assert_template_result('<tr class="row1">\n<td class="col1"> 1 </td><td class="col2"> 2 </td><td class="col3"> 3 </td></tr>\n<tr class="row2"><td class="col1"> 4 </td><td class="col2"> 5 </td><td class="col3"> 6 </td></tr>\n',
      '{% tablerow n in numbers cols:3 offset:1 limit:6%} {{n}} {% endtablerow %}',
      { numbers: [0, 1, 2, 3, 4, 5, 6, 7] });
  });

  it('test_blank_string_not_iterable', async () => {
    await assert_template_result('<tr class="row1">\n</tr>\n', '{% tablerow char in characters cols:3 %}I WILL NOT BE OUTPUT{% endtablerow %}', { characters: '' });
  });
});

