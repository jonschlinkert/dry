'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const isWin = process.platform === 'win32';

const PATH_REGEX = isWin ? /^(?![A-Z]:)[^.\\/][a-zA-Z0-9_\\/]+$/ : /^[^./][a-zA-Z0-9_/]+$/;

class FileSystemError extends Error {}

// A Liquid file system is a way to let your templates retrieve other templates
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
//   Liquid::Template.file_system = Liquid::LocalFileSystem.new(template_path)
//   liquid = Liquid::Template.parse(template)
//
// This will parse the template with a LocalFileSystem implementation rooted at 'template_path'.
class BlankFileSystem {
  // Called by Liquid to retrieve a template file
  read(_template_path) {
    throw new FileSystemError('This liquid context does not allow includes.');
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
//   file_system = Liquid::LocalFileSystem.new("/some/path")
//
//   file_system.path("mypartial")       // => "/some/path/_mypartial.liquid"
//   file_system.path("dir/mypartial")   // => "/some/path/dir/_mypartial.liquid"
//
// Optionally in the second argument you can specify a custom pattern for template filenames.
// The Node.js `util.format()` method is used.
// Default pattern is "_%s.liquid".
//
// Example:
//
//   file_system = Liquid::LocalFileSystem.new("/some/path", "%s.html")
//
//   file_system.path("index") // => "/some/path/index.html"
//
class LocalFileSystem {
  constructor(basedir, pattern = '_%s.liquid') {
    this.basedir = basedir;
    this.pattern = pattern;
  }

  exists(filepath) {
    return fs.existsSync(filepath);
  }

  read(template_path) {
    const absolute = this.path(template_path);
    if (!this.exists(absolute)) throw new FileSystemError(`No such template '${template_path}'`);
    return fs.readFileSync(absolute);
  }

  path(template_path) {
    if (!PATH_REGEX.test(template_path)) {
      throw new FileSystemError(`Illegal template name '${template_path}'`);
    }

    const f = filepath => util.format(this.pattern, filepath);
    const absolute = (() => {
      if (template_path.includes(path.sep)) {
        return path.resolve(this.basedir, path.dirname(template_path), f(path.basename(template_path)));
      } else {
        return path.resolve(this.basedir, f(template_path));
      }
    })();

    if (!path.resolve(absolute).startsWith(`${path.resolve(this.basedir)}${path.sep}`)) {
      throw new FileSystemError(`Illegal template path '${absolute}'`);
    }

    return absolute;
  }
}

module.exports = {
  BlankFileSystem,
  LocalFileSystem
};
