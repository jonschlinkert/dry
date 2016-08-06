'use strict';

require('mocha');
var fs = require('fs');
var path = require('path');
var extend = require('extend-shallow');
var merge = require('mixin-deep');
var repeat = require('repeat-string');
var assert = require('assert');
var should = require('should');
var glob = require('matched');
var File = require('vinyl');
var blocks = require('..');

var fixtures = path.join.bind(path, __dirname, 'fixtures');

function read(filepath) {
  return fs.readFileSync(filepath);
}
function createFile(fp, options) {
  var opts = extend({cwd: process.cwd()}, options);
  opts.path = path.resolve(opts.cwd, fp);
  var file = new File(opts);
  file.cwd = opts.cwd;
  file.base = opts.cwd;
  file.contents = fs.readFileSync(file.path);
  return file;
}
function fixture(filepath) {
  return read(fixtures(filepath)).toString();
}
function expected(filepath) {
  return read(path.join(__dirname, 'expected', filepath)).toString();
}

function loadBlocks(patterns, options) {
  var opts = extend({cwd: process.cwd(), helpers: ['foo']}, options);
  return glob.sync(patterns, opts)
    .reduce(function(acc, fp) {
      var file = createFile(fp, opts);
      var ast;

      Object.defineProperty(file, 'ast', {
        configurable: true,
        enumerable: true,
        set: function(val) {
          ast = val;
        },
        get: function() {
          return ast || (ast = blocks.parse(this, opts));
        }
      });

      acc[file.relative] = file;
      return acc;
    }, {});
}

var files = loadBlocks('*.html', {cwd: path.join(__dirname, 'fixtures/blocks')});

function createUnit(name, description) {
  var options = {};

  if (description && typeof description === 'object') {
    var obj = description;
    description = obj.description;
    options = obj.options;
  }

  it(description, function() {
    var file = createFile(name, {cwd: fixtures()});
    var opts = merge({}, options, {files: files});
    if (opts.file) {
      for (var key in opts.file) {
        if (opts.file.hasOwnProperty(key)) {
          file[key] = opts.file[key];
        }
      }
    }

    var res = blocks(file, opts);
    var val = opts.expected;
    if (typeof val === 'undefined') {
      val = expected(name);
    }

    var str = res.contents.toString();
    assert.equal(str, val);
  });
}

function createUnits(re, units) {
  if (!(re instanceof RegExp)) {
    units = re;
    re = /./;
  }
  for (var key in units) {
    if (!re.test(key)) continue;
    if (units.hasOwnProperty(key)) {
      createUnit(key, units[key]);
    }
  }
}

describe('blocks', function() {
  describe('errors', function() {
    it('should throw an error when multiple extends are defined', function(cb) {
      var file = createFile('error-multiple-extends.html', {cwd: fixtures()});
      try {
        blocks(file, {files: files});
        cb(new Error('expected an error'));
      } catch (err) {
        assert.equal(err.message, 'only one "extends" tag may be defined per template');
        cb();
      }
    });

    it('should throw an error when extend is defined and the template cannot be found', function(cb) {
      var file = createFile('error-missing-block.html', {cwd: fixtures()});
      try {
        blocks(file, {files: files});
        cb(new Error('expected an error'));
      } catch (err) {
        assert.equal(err.message, 'tag "extends" cannot find "missing", in error-missing-block.html');
        cb();
      }
    });
  });

  describe('layout tag', function() {
    createUnits({
      'layout-tag.html': 'should inject content',
      'layout-tag-replace.html': 'should replace content',
      'layout-tag-nested.html': 'should work with nested content',
      'layout-file-property.html': {
        description: 'should use a layout defined on the file object',
        options: {
          file: {
            layout: 'layout-default.html'
          }
        }
      },
    });
  });

  describe('extend block', function() {
    createUnits({
      'block.html': 'should replace a block',
      'block-file-extends.html': {
        description: 'should extend a block defined on the file object',
        options: {
          file: {
            extends: 'basic'
          }
        }
      },
      'replace-block.html': 'should replace a block',
      'prepend-block.html': 'should prepend a block',
      'append-block.html': 'should append a block',
      'text-nodes.html': 'should not render nodes that are not inside blocks',
      'repeat.html': 'should repeat a block multiple times if defined in parent',
    });
  });

  describe('missing blocks', function() {
    createUnits({
      'blocks-missing.html': 'should not render blocks that are not defined in the parent template',
    });
  });

  describe('multiple blocks', function() {
    createUnits({
      'block-multiple.html': 'should replace multiple blocks',
      'replace-block-multiple.html': 'should replace multiple blocks using `replace` hash argument',
      'prepend-block-multiple.html': 'should prepend multiple blocks using `prepend` hash argument',
      'append-block-multiple.html': 'should append multiple blocks using `append` hash argument',
      'mixed-multiple.html': 'should replace, append or prepend multiple blocks',
    });
  });

  describe('nested extends', function() {
    createUnits({
      'nested-extends.html': 'should handled nested extends',
      'nested-extends-append.html': 'should append nested extends',
      'nested-extends-append-stacked.html': 'should stack appended nested extends',
      'nested-extends-prepend.html': 'should prepend nested extends',
      'nested-extends-mixed.html': 'should replace, append or prepend multiple nested blocks',
      'nested-extends-mixed2.html': 'should replace, append or prepend multiple nested blocks2',
    });
  });

  describe('nested blocks:', function() {
    createUnits({
      'nested-blocks-1.html': 'nested blocks',
      'nested-blocks-prepend.html': 'prepend',
      'nested-blocks-append.html': 'append',
      'nested-blocks-append-repeat.html': 'append-repeat',
      'accessors.html': 'accessors',
    });
  });

  describe('merge blocks', function() {
    createUnits({
      'merge-blocks.html': 'should merge blocks',
    });
  });

  describe('options', function() {
    createUnits({
      'options-trim.html': {
        description: 'should leading and trailing whitepace in blocks',
        options: {trim: true}
      }
    });
  });

  describe('helpers', function() {
    createUnits({
      'helpers.html': {
        description: 'should do stuff with helpers',
        options: {
          helpers: {
            foo: function() {
              return this.fn();
            }
          }
        }
      },
      // 'helpers-extends.html': {
      //   description: 'should extend another helper block',
      //   options: {
      //     helpers: {
      //       foo: function() {
      //         console.log('args:', arguments);
      //         console.log('this:', this);
      //         return this.fn();
      //       }
      //     }
      //   }
      // },
    });
  });

  describe('filters', function() {
    createUnits({
      'filter.html': {
        description: 'should return an empty string when variable is not on the context',
        options: {
          expected: ''
        }
      },
      'filter.html': {
        description: 'should use a filter function',
        options: {
          locals: {title: 'doowb'},
          expected: 'DOOWB',
          filters: {
            upper: function(str) {
              return str.toUpperCase();
            }
          }
        }
      },
      'filters.html': {
        description: 'should use multiple filter functions',
        options: {
          locals: {title: 'doowb'},
          expected: 'DOOWBDOOWB',
          filters: {
            repeat: function(str, n) {
              return repeat(str, n);
            },
            upper: function(str) {
              return str.toUpperCase();
            }
          }
        }
      }
    });
  });
});
