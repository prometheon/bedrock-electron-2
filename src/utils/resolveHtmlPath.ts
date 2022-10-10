/* eslint import/prefer-default-export: off, import/no-mutable-exports: off */
import { URL } from 'url';
import { app } from 'electron';
import path from 'path';

let resolveHtmlPath: (htmlFileName: string) => string;
let resolvePreloadPath: () => string;

if (process.env.NODE_ENV === 'development') {
  const port = process.env.PORT || 1212;
  resolveHtmlPath = (htmlFileName: string) => {
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  };

  resolvePreloadPath = () => {
    return path.join(__dirname, '../main/preload.js');
  };
} else {
  resolveHtmlPath = (htmlFileName: string) => {
    return `file://${app.getAppPath()}/dist/renderer/${htmlFileName}`;
  };

  resolvePreloadPath = () => {
    return `file://${app.getAppPath()}/dist/main/preload.js`;
  };
}

export { resolveHtmlPath, resolvePreloadPath };
