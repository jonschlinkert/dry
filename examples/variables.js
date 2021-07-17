'use strict';

const Dry = require('..');
const pause = (v, ms = 1000) => new Promise(res => setTimeout(() => res(v), ms));

(async () => {
  const baz = () => pause('doowb', 500);
  const foo = () => pause({ bar: { baz: 'doowb' } }, 500);

  console.log({
    expected: '<doowb>',
    actual: await Dry.Template.render('<{{ foo.bar.baz }}>', { foo: { bar: { baz } } })
  });

  console.log({
    expected: '<doowb>',
    actual: await Dry.Template.render('<{{ foo.bar.baz }}>', { foo })
  });

})();
