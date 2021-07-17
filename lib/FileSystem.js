'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const Dry = require('./Dry');
const isWin = process.platform === 'win32';

const PATH_REGEX = isWin ? /^(?![A-Z]:)[^.\\/][a-zA-Z0-9_\\/]+$/ : /^[^./][a-zA-Z0-9_/]+$/;

// A Dry file system is a way to let your templates retrieve other templates
// for use with the include tag.
//
// You can implement subclasses that retrieve templates from the database, from
// the file system using a different path structure, you can provide them as hard-coded
// inline strings, or any manner that you see fit.
//
// You can add additional instance variables, arguments, or methods as needed.
//
// Example:
//
//   Dry.Template.file_system = new Dry.LocalFileSystem(template_path)
//   liquid = Dry.Template.parse(template)
//
// This will parse the template with a LocalFileSystem implementation rooted at 'template_path'.
class BlankFileSystem {
  // Called by Dry to retrieve a template file
  read_template_file(_template_path) {
    throw new Dry.FileSystemError('This liquid context does not allow includes.');
  }
}

// This implements an abstract file system which retrieves template files named in
// a manner similar to Rails partials, ie. with the template name prefixed with an
// underscore. The extension ".liquid" is also added.
//
// For security reasons, template paths are only allowed to contain letters, numbers,
// and underscore.
//
// Example:
//
//   file_system = new Dry.LocalFileSystem("/some/path")
//   file_system.full_path("mypartial")       // => "/some/path/_mypartial.liquid"
//   file_system.full_path("dir/mypartial")   // => "/some/path/dir/_mypartial.liquid"
//
// Optionally in the second argument you can specify a custom pattern for template filenames.
// The Node.js `util.format()` method is used.
// Default pattern is "_%s.liquid".
//
// Example:
//
//   file_system = new Dry.LocalFileSystem("/some/path", "%s.html")
//   file_system.full_path("index") // => "/some/path/index.html"
//
class LocalFileSystem {
  constructor(basedir, pattern = '_%s.liquid') {
    this.basedir = basedir;
    this.pattern = pattern;
  }

  exists(filepath) {
    return fs.existsSync(filepath);
  }

  read_template_file(template_path, pattern = this.pattern, raise_on_not_found = true) {
    if (Array.isArray(pattern)) {
      while (pattern.length) {
        const p = pattern.shift();
        const found = this.read_template_file(template_path, p, pattern.length === 0);
        if (found) return found;
      }
      return null;
    }

    const absolute = this.full_path(template_path, pattern);

    if (raise_on_not_found && !this.exists(absolute)) {
      throw new Dry.FileSystemError(`Cannot find template file: '${template_path}'`);
    }

    return fs.readFileSync(absolute);
  }

  full_path(template_path, pattern = this.pattern) {
    if (!PATH_REGEX.test(template_path)) {
      throw new Dry.FileSystemError(`Illegal template name '${template_path}'`);
    }

    const f = filepath => util.format(pattern, filepath);
    const absolute = (() => {
      if (template_path.includes(path.sep)) {
        return path.resolve(this.basedir, path.dirname(template_path), f(path.basename(template_path)));
      } else {
        return path.resolve(this.basedir, f(template_path));
      }
    })();

    if (!path.resolve(absolute).startsWith(`${path.resolve(this.basedir)}${path.sep}`)) {
      throw new Dry.FileSystemError(`Illegal template path '${absolute}'`);
    }

    return absolute;
  }
}

class LayoutFileSystem {
  constructor(files = {}) {
    this.files = files;
  }

  exists(layout_path) {
    return hasOwnProperty.call(this.files, layout_path);
  }

  read_template_file(layout_path) {
    return this.files[layout_path];
  }

  full_path(layout_path) {
    return path.resolve(layout_path);
  }
}

module.exports = {
  BlankFileSystem,
  LocalFileSystem,
  LayoutFileSystem
};
