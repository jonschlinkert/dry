
const assert = require('node:assert/strict');
const Dry = require('../..');

describe('template_factory_unit_test', () => {
  it('test_for_returns_liquid_template_instance', () => {
    const template = new Dry.TemplateFactory().for('anything');
    assert(template instanceof Dry.Template);
  });
});

