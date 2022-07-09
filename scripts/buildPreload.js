const path = require('path');
const fs = require('fs');

const outFile = path.resolve(__dirname, '../src/dist/preload.js');

// const modules = [
//     'src/preload.js'
// ]

function buildPreload() {
  /* concatenate modules */
  //   let output = ''
  //   modules.forEach(function (script) {
  //     output += fs.readFileSync(path.resolve(__dirname, '../', script)) + ';\n'
  //   })

  const output = `${fs.readFileSync(
    path.resolve(__dirname, '../src/', 'preload.js')
  )};\n`;

  fs.writeFileSync(outFile, output, { encoding: 'utf-8' });
}

if (module.parent) {
  module.exports = buildPreload;
} else {
  buildPreload();
}
