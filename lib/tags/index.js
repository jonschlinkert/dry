'use strict';

const fs = require('fs');
const path = require('path');
const files = fs.readdirSync(__dirname, { withFileTypes: true })
  .filter(file => file.isFile() && file.name !== 'index.js' && file.name.endsWith('.js'))
  .map(file => {
    file.stem = path.basename(file.name, path.extname(file.name));
    file.path = path.join(__dirname, file.name);
    return file;
  });

for (const file of files) {
  exports[file.stem] = exports[file.stem.toLowerCase()] = require(file.path);
}
