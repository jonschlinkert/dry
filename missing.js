'use strict';

const readdir = require('@folder/readdir');
const ignore = ['node_modules', 'performance', 'example', 'tmp'];
const liquid_base = '/Users/jonschlinkert/dev/dry/dry-may-2021/vendor/liquid-with-js';

const load_files = async (dir, options) => {
  const opts = { recursive: true, ...options, objects: true };
  const files = [];

  const onDirectory = async file => {
    file.recurse = !ignore.includes(file.name);
  };

  const onFile = async file => {
    if (file.name.endsWith('.js')) {
      files.push(file);
    }
  };

  await readdir(dir, { ...opts, onDirectory, onFile });
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
};

const dry_files = async (dir, options) => {
  return load_files(dir, options);
};

const liquid_files = async (dir, options) => {
  return load_files(dir, options);
};

dry_files(__dirname)
  .then(async files => {

    return liquid_files(liquid_base).then(dirents => {
      let i = 0;
      for (const dirent of dirents) {
        if (!dirent.relative.startsWith('test/')) continue;
        // dirent.relative = dirent.relative.split(path.sep).filter(p => p !== 'liquid').join(path.sep);
        // console.log(dirent.relative);
        if (!files.some(file => file.relative === dirent.relative)) {
          console.log(i, ' '.repeat(2 - String(i).length), dirent.relative);
          i++;
        }
      }
    });
  });
