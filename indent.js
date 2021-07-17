'use strict';

const unindent = input => {
  const lines = input.replace(/^\s*\n|\n\s*$|^\s+$/g, '').replace(/\t/g, '  ').split('\n');
  const indents = lines.filter(line => line.trim()).map(line => line.match(/^ */)[0].length);
  const min = Math.min(...indents);
  return lines.map(line => line.slice(min)).join('\n');
};

const foo = `

    This
      is
    an indented
     a
      string

`;

console.log(unindent(foo));
