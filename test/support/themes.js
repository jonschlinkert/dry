'use strict';

const fs = require('fs');
const path = require('path');
const readdir = require('@folder/readdir');
const Dry = require('../..');

const themes = async (dir, options) => {
  const opts = { recursive: true, ...options, objects: true };
  const onFile = async file => {
    if (file.name.endsWith('.md')) {
      const contents = fs.readFileSync(file.path);
      const template = Dry.Template.parse(contents);
      const output = template.render();
      console.log(output);
      // console.log(file.path);
      // if (file.name === 'abs.md') {
      // }
    }
  };

  await readdir(dir, { ...opts, onFile });
};

// themes(path.join(__dirname, '../fixtures/filters'));
// console.log(Dry.Parser.all_tags);
