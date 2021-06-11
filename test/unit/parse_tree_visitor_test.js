// 'use strict';

// const assert = require('assert').strict;
// const Dry = require('../..');
// const { ParseTreeVisitor, Template } = Dry;
// const Tags = [...new Set(Object.values(Dry.tags))]
//   .concat([...new Set(Object.values(Dry.nodes))])
//   .filter(v => typeof v === 'function');

// const traversal = template => {
//   return ParseTreeVisitor
//     .for(Template.parse(template, { error_mode: 'lax' }).root.ast)
//     .add_callback_for(...Tags, node => node.name);
// };

// const visit = template => {
//   return traversal(template).visit().flat(Infinity).filter(Boolean);
// };

// describe.skip('parse_tree_visitor_test', () => {
//   it('test_variable', () => {
//     assert.deepEqual(['test'], visit('{{ test }}'));
//   });

//   it('test_varible_with_filter', () => {
//     assert.deepEqual(['test', 'infilter'], visit('{{ test | split: infilter }}'));
//   });

//   it('test_dynamic_variable', () => {
//     assert.deepEqual(['test', 'inlookup'], visit('{{ test[inlookup] }}'));
//   });

//   it('test_echo', () => {
//     assert.deepEqual(['test'], visit('{% echo test %}'));
//   });

//   it('test_if_condition', () => {
//     assert.deepEqual(['test'], visit('{% if test %}{% endif %}'));
//   });

//   it('test_complex_if_condition', () => {
//     assert.deepEqual(['test'], visit('{% if 1 == 1 and 2 == test %}{% endif %}'));
//   });

//   it('test_if_body', () => {
//     assert.deepEqual(['test'], visit('{% if 1 == 1 %}{{ test }}{% endif %}'));
//   });

//   it('test_unless_condition', () => {
//     assert.deepEqual(['test'], visit('{% unless test %}{% endunless %}'));
//   });

//   it('test_complex_unless_condition', () => {
//     assert.deepEqual(['test'], visit('{% unless 1 == 1 and 2 == test %}{% endunless %}'));
//   });

//   it('test_unless_body', () => {
//     assert.deepEqual(['test'], visit('{% unless 1 == 1 %}{{ test }}{% endunless %}'));
//   });

//   it('test_elsif_condition', () => {
//     assert.deepEqual(['test'], visit('{% if 1 == 1 %}{% elsif test %}{% endif %}'));
//   });

//   it('test_complex_elsif_condition', () => {
//     assert.deepEqual(['test'], visit('{% if 1 == 1 %}{% elsif 1 == 1 and 2 == test %}{% endif %}'));
//   });

//   it('test_elsif_body', () => {
//     assert.deepEqual(['test'], visit('{% if 1 == 1 %}{% elsif 2 == 2 %}{{ test }}{% endif %}'));
//   });

//   it('test_else_body', () => {
//     assert.deepEqual(['test'], visit('{% if 1 == 1 %}{% else %}{{ test }}{% endif %}'));
//   });

//   it('test_case_left', () => {
//     assert.deepEqual(['test'], visit('{% case test %}{% endcase %}'));
//   });

//   it('test_case_condition', () => {
//     assert.deepEqual(['test'], visit('{% case 1 %}{% when test %}{% endcase %}'));
//   });

//   it('test_case_when_body', () => {
//     assert.deepEqual(['test'], visit('{% case 1 %}{% when 2 %}{{ test }}{% endcase %}'));
//   });

//   it('test_case_else_body', () => {
//     assert.deepEqual(['test'], visit('{% case 1 %}{% else %}{{ test }}{% endcase %}'));
//   });

//   it('test_for_in', () => {
//     assert.deepEqual(['test'], visit('{% for x in test %}{% endfor %}'));
//   });

//   it('test_for_limit', () => {
//     assert.deepEqual(['test'], visit('{% for x in (1..5) limit: test %}{% endfor %}'));
//   });

//   it('test_for_offset', () => {
//     assert.deepEqual(['test'], visit('{% for x in (1..5) offset: test %}{% endfor %}'));
//   });

//   it('test_for_body', () => {
//     assert.deepEqual(['test'], visit('{% for x in (1..5) %}{{ test }}{% endfor %}'));
//   });

//   it('test_tablerow_in', () => {
//     assert.deepEqual(['test'], visit('{% tablerow x in test %}{% endtablerow %}'));
//   });

//   it('test_tablerow_limit', () => {
//     assert.deepEqual(['test'], visit('{% tablerow x in (1..5) limit: test %}{% endtablerow %}'));
//   });

//   it('test_tablerow_offset', () => {
//     assert.deepEqual(['test'], visit('{% tablerow x in (1..5) offset: test %}{% endtablerow %}'));
//   });

//   it('test_tablerow_body', () => {
//     assert.deepEqual(['test'], visit('{% tablerow x in (1..5) %}{{ test }}{% endtablerow %}'));
//   });

//   it('test_cycle', () => {
//     assert.deepEqual(['test'], visit('{% cycle test %}'));
//   });

//   it('test_assign', () => {
//     assert.deepEqual(['test'], visit('{% assign x = test %}'));
//   });

//   it('test_capture', () => {
//     assert.deepEqual(['test'], visit('{% capture x %}{{ test }}{% endcapture %}'));
//   });

//   it('test_include', () => {
//     assert.deepEqual(['test'], visit('{% include test %}'));
//   });

//   it('test_include_with', () => {
//     assert.deepEqual(['test'], visit('{% include "hai" with test %}'));
//   });

//   it('test_include_for', () => {
//     assert.deepEqual(['test'], visit('{% include "hai" for test %}'));
//   });

//   it('test_preserve_tree_structure', () => {
//     assert.deepEqual([[null, [ [null, [[null, [['other', []]]]]], ['test', []], ['xs', []] ]]],
//       traversal('{% for x in xs offset: test %}{{ other }}{% endfor %}').visit
//     );
//   });
// });

