import { readFileSync } from 'fs';
import { basename, extname } from 'path';
import { lookup } from 'mime-types';

const getArrayBuffer = (path: string) => {
  const buffer = readFileSync(path);
  const arrayBuffer = buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
  return [arrayBuffer];
};

function localFileData(path: string) {
  return {
    arrayBuffer: getArrayBuffer(path),
    name: basename(path),
    type: lookup(extname(path)) || undefined,
  };
}

export default localFileData;
