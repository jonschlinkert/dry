'use strict';

const { defineProperty } = Reflect;
const fs = require('fs');
const path = require('path');
const kRegistered = Symbol('registered');

class Dry {}
const dry = require('export-files')(__dirname, new Dry(), { case: ['name'] });

const tagsdir = path.join(__dirname, 'tags');
const files = fs.readdirSync(tagsdir, { withFileTypes: true });
const tags = [];

for (const file of files) {
  if (file.isFile() && file.name.endsWith('.js') && file.name !== 'index.js') {
    file.path = path.join(tagsdir, file.name);
    file.stem = file.name.slice(0, -3);
    tags.push(file);

    defineProperty(dry, file.stem, {
      get() {
        return file.fn || (file.fn = require(file.path));
      }
    });
  }
}

dry.Drop = require('./drops/Drop');
dry.register = () => {
  if (!dry[kRegistered]) {
    dry[kRegistered] = true;

    for (const file of tags) {
      dry.Template.register_tag(file.stem.toLowerCase(), dry[file.stem]);
    }
  }

  dry.Template.register_filter(require('./StandardFilters'));
  // dry.Registry = require('./tag/Registry');
  // dry.interrupts = require('./Interrupts');
};

Object.assign(dry, require('./errors'));
dry.clearFilters = () => dry.StrainerFactory.clear();
module.exports = dry;
