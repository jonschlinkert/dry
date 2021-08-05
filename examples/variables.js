'use strict';

const { render_strict, Template } = require('..');
const pause = (v, ms = 1000) => new Promise(res => setTimeout(() => res(v), ms));
const upper = v => v.toUpperCase();
const append = (a, b) => a + b;

Template.register_filter('append', append);
Template.register_filter('upper', upper);

(async () => {
  const baz = () => pause('doowb', 10);
  // const foo = () => pause({ bar: { baz: 'doowb' } }, 10);
  const foo = () => pause({ bar: pause({ baz: 'doowb' }, 10) }, 10);

  // console.log({
  //   expected: '<doowb>',
  //   actual: await render('<{{ foo.bar.baz }}>', { foo: { bar: { baz } } })
  // });

  // console.log({
  //   expected: '<doowb>',
  //   actual: await render('<{{ foo.bar.baz }}>', { foo })
  // });

  console.log({
    expected: '<doowb>',
    actual: await render_strict('<{{ upper(append(foo.bar.baz, "-after")) }}>', { foo })
  });

  console.log({
    expected: '<doowb>',
    actual: await render_strict('<{{ foo.bar.baz | upper }}>', { foo })
  });
})();
