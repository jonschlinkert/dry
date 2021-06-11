'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const { FileSystemError } = Dry;
const { FileSystem } = Dry;
const { BlankFileSystem, LocalFileSystem } = FileSystem;

describe('file_system_unit_test', () => {
  it('test_default', () => {
    assert.throws(() => new BlankFileSystem().read_template_file('dummy'), FileSystemError);
  });

  it('test_local', () => {
    const file_system = new LocalFileSystem('/some/path');
    assert.equal('/some/path/_mypartial.liquid', file_system.full_path('mypartial'));
    assert.equal('/some/path/dir/_mypartial.liquid', file_system.full_path('dir/mypartial'));

    assert.throws(() => file_system.full_path('../dir/mypartial'), FileSystemError);

    assert.throws(() => file_system.full_path('/dir/../../dir/mypartial'), FileSystemError);

    assert.throws(() => file_system.full_path('/etc/passwd'), FileSystemError);
  });

  it('test_custom_template_filename_patterns', () => {
    const file_system = new LocalFileSystem('/some/path', '%s.html');
    assert.equal('/some/path/mypartial.html', file_system.full_path('mypartial'));
    assert.equal('/some/path/dir/mypartial.html', file_system.full_path('dir/mypartial'));
  });
});
