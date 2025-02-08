const Template = require('../lib/Template');

// def test_for_dynamic_find_var
// assert_template_result(' 1  2  3 ', '{%for item in (bar..[key]) %} {{item}} {%endfor%}', 'key' => 'foo', 'foo' => 3, 'bar' => 1)
// end

// # Regression test for old regex that has backtracking issues
// def test_for_regular_expression_backtracking
// with_error_mode(:strict) do
//   assert_raises(Liquid::SyntaxError) do
//     Template.parse("{%for item in (1#{'.' * 50000})! %} {{item}} {%endfor%}")
//   end
// end
// end

const generateFixture = () => {
  const result = `{% for i in ('${'.'.repeat(10_000_000)}') %}\n{% endfor %}\n`;
  return result;
};

const template = Template.parse(generateFixture());

template.render()
  .then(console.log)
  .catch(console.error);
