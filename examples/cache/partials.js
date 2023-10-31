
require('time-require');

const start = Date.now();
process.on('exit', () => console.log(`Time: ${Date.now() - start}ms`));

const assert = require('assert');
const Dry = require('../..');
const { Context, PartialCache, State } = Dry;
const { StubFileSystem } = require('../../test/test_helpers');

const context = Context.build({
  registers: {
    file_system: new StubFileSystem({ my_partial: 'my partial body' })
  }
});

const partial = PartialCache.load('my_partial', {
  context,
  state: new State()
});

partial.render()
  .then(output => {
    console.log({ output });
    assert.equal('my partial body', output);
  })
  .catch(err => {
    console.error(err);
  });
