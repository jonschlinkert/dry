const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');
const Dry = require('./Dry');

const PATH_REGEX = process.platform === 'win32'
  ? /^(?![A-Z]:)[^.\\/][a-zA-Z0-9_\\/]+$/
  : /^[^./][a-zA-Z0-9_/]+$/;

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
  read_template_file() {
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
    this.basedir = path.resolve(basedir);
    this.pattern = pattern;
  }

  exists(filepath) {
    return fs.existsSync(filepath);
  }

  read_template_file(template_path, pattern = this.pattern, raise_on_not_found = true) {
    const absolute = this.full_path(template_path, pattern);

    if (raise_on_not_found && !this.exists(absolute)) {
      throw new Dry.FileSystemError(`Cannot find template file: '${template_path}'`);
    }

    return fs.readFileSync(absolute);
  }

  sanitize_path(filepath) {
    const normalized = path.normalize(filepath).replace(/\\/g, '/');

    if (normalized.includes('../') || normalized.includes('..\\')) {
      throw new Dry.FileSystemError('Directory traversal is not permitted');
    }

    if (normalized.includes('\0') || normalized.includes('\\0')) {
      throw new Dry.FileSystemError('Null bytes are not permitted in paths');
    }

    const absolute = path.resolve(this.basedir, normalized);

    if (!absolute.startsWith(this.basedir)) {
      throw new Dry.FileSystemError('Path must remain within base directory');
    }

    return absolute;
  }

  is_insdie_basedir(filepath) {
    try {
      const absolute = this.sanitize_path(filepath);
      return absolute.startsWith(this.basedir);
    } catch {
      return false;
    }
  }

  check_path(filepath) {
    if (!this.is_insdie_basedir(filepath)) {
      throw new Dry.FileSystemError(`Illegal template path '${filepath}'`);
    }
  }

  full_path(template_path, pattern = this.pattern) {
    if (!PATH_REGEX.test(template_path)) {
      throw new Dry.FileSystemError(`Illegal template name '${template_path}'`);
    }

    const filename = util.format(pattern, path.basename(template_path));
    const dirname = path.dirname(template_path);
    const absolute = this.sanitize_path(path.join(dirname, filename));

    this.check_path(absolute);
    return absolute;
  }
}

module.exports = {
  BlankFileSystem,
  LocalFileSystem
};
