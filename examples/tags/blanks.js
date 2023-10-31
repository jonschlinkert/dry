
const Dry = require('../..');

const source = ' {%- assign foo = "bar" -%} {%- case foo -%} {%- when "bar" -%} {%- when "whatever" -%} {% else %} {%- endcase -%} ';

const template = Dry.Template.parse(source);

(async () => {

  console.log({
    expected: '',
    actual: await template.render()
  });

})();
