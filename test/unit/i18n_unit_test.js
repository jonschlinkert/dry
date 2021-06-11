'use strict';

const assert = require('assert').strict;
const { fixture } = require('../test_helpers');
const Dry = require('../..');
const { I18n } = Dry;

describe('i18n_unit_test', () => {
  let i18n;

  before(() => {
    i18n = new I18n(fixture('en_locale.yml'));
  });

  it('test_simple_translate_string', () => {
    assert.equal('less is more', i18n.translate('simple'));
  });

  it('test_nested_translate_string', () => {
    assert.equal("something wasn't right", i18n.translate('errors.syntax.oops'));
  });

  it('test_single_string_interpolation', () => {
    assert.equal('something different', i18n.translate('whatever', { something: 'different' }));
  });

  it('test_raises_unknown_translation', () => {
    assert.throws(() => i18n.translate('doesnt_exist'), I18n.TranslationError);
  });

  it('test_sets_default_path_to_en', () => {
    assert.equal(I18n.DEFAULT_LOCALE, new I18n().path);
  });
});
