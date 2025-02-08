
const assert = require('node:assert/strict');
const Dry = require('../..');
const { FileSystem, FileSystemError } = Dry;
const { BlankFileSystem, LocalFileSystem } = FileSystem;

const p = filepath => {
  return process.platform === 'win32' ? filepath.slice(2).split('\\').join('/') : filepath;
};

describe('file_system_unit_test', () => {
  it('test_default', () => {
    assert.throws(() => new BlankFileSystem().read_template_file('dummy'), FileSystemError);
  });

  it('test_local', () => {
    const file_system = new LocalFileSystem('/some/path');
    assert.equal('/some/path/_mypartial.liquid', p(file_system.full_path('mypartial')));
    assert.equal('/some/path/dir/_mypartial.liquid', p(file_system.full_path('dir/mypartial')));

    assert.throws(() => p(file_system.full_path('../dir/mypartial')), FileSystemError);
    assert.throws(() => p(file_system.full_path('/dir/../../dir/mypartial')), FileSystemError);
    assert.throws(() => p(file_system.full_path('/etc/passwd')), FileSystemError);
  });

  it('test_custom_template_filename_patterns', () => {
    const file_system = new LocalFileSystem('/some/path', '%s.html');
    assert.equal('/some/path/mypartial.html', p(file_system.full_path('mypartial')));
    assert.equal('/some/path/dir/mypartial.html', p(file_system.full_path('dir/mypartial')));
  });
});
