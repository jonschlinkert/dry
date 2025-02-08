
const assert = require('node:assert/strict');
const { fixture } = require('../test_helpers');
const Dry = require('../..');
const { I18n, Template } = Dry;

describe('template unit tests', () => {
  it('sets_default_localization_in_document', () => {
    const template = new Template();
    template.parse('{%comment%}{%endcomment%}');
    assert(template.root.ast.nodes[0].state.locale instanceof I18n);
  });

  it('sets_default_localization_in_context_with_quick_initialization', () => {
    const template = new Template();
    template.parse('{%comment%}{%endcomment%}', { locale: new I18n(fixture('en_locale.yml')) });

    const locale = template.root.ast.nodes[0].state.locale;
    assert(locale instanceof I18n);
    assert.equal(fixture('en_locale.yml'), locale.path);
  });

  it('tags_delete', () => {
    class FakeTag {}
    Template.register_tag('fake', FakeTag);
    assert.equal(FakeTag, Template.tags.get('fake'));

    Template.tags.delete('fake');
    assert(!Template.tags.get('fake'));
  });

  it('tags_can_be_looped_over', cb => {
    class FakeTag {}
    try {
      Template.tags.clear();
      Template.register_tag('fake', FakeTag);
      assert([...Template.tags.keys()].includes('fake'));
      cb();
    } catch (err) {
      cb(err);
    } finally {
      Template.tags.delete('fake');
    }
  });

  it('template_inheritance', async () => {
    class TemplateSubclass extends Dry.Template {}
    assert.equal('foo', await TemplateSubclass.parse('foo').render());
  });
});
