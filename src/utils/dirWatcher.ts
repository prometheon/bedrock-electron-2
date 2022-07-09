// /* eslint-disable promise/catch-or-return */
// /* eslint-disable @typescript-eslint/no-use-before-define */
// import { ipcMain } from 'electron';
// import nsfw from 'nsfw';
// import dirTree from 'directory-tree';
// import { platform } from 'process';
// import { exec } from 'child_process';
// import localFileData from './LocalFileData';

// const DIR_WATCHER_EVENTS_CHANNEL_NAME = 'dir-watcher';
// const homedir = require('os').homedir().replaceAll('\\', '/');

// const initDirWatcher = (webContents: Electron.WebContents) => {
//   ipcMain.on(DIR_WATCHER_EVENTS_CHANNEL_NAME, (_, options) =>
//     handleDirWatcherEvents(webContents, options)
//   );
//   return nsfw(homedir, function (events: any) {
//     webContents.send(DIR_WATCHER_EVENTS_CHANNEL_NAME, {
//       type: 'DIR_EVENT',
//       events,
//     });
//   }).then(function (w: any) {
//     // watcher1 = w;
//     w.start();
//     return w;
//   });
// };

// const handleDirWatcherEvents = (
//   webContents: Electron.WebContents,
//   data: any
// ) => {
//   const { action, options } = data;
//   if (action === 'GET_TREE') {
//     sendTree(webContents, options.path);
//   }
//   if (action === 'GET_FILE') {
//     sendFileData(webContents, options);
//   }
//   if (action === 'OPEN_FILE') {
//     openLocalFile(options.path);
//   }
// };

// const openLocalFile = (path: string) => {
//   if (platform === 'win32') {
//     exec(path);
//   } else if (platform === 'darwin') {
//     exec(`open ${path}`);
//   }
// };

// const sendFileData = (
//   webContents: Electron.WebContents,
//   options: {
//     path: string;
//     destinationEid: string;
//   }
// ) => {
//   const fileData = localFileData(options.path);

//   webContents.send(DIR_WATCHER_EVENTS_CHANNEL_NAME, {
//     type: 'FILE',
//     file: fileData,
//     ...options,
//   });
// };

// const sendTree = (webContents: Electron.WebContents, path: string) => {
//   const flatTree: {
//     [path: string]: any;
//   } = {};
//   const tree = dirTree(path, {
//     exclude: /.*\/\..*/,
//     depth: 2,
//     attributes: ['type', 'extension'],
//     normalizePath: true,
//   });

//   const buildFlatTree = (items: any[]) => {
//     for (let index = 0; index < items.length; index += 1) {
//       const file = items[index];
//       if (file?.type === 'directory' && file?.children) {
//         flatTree[file.path] = file;
//         buildFlatTree(file.children);
//       }
//     }
//   };

//   buildFlatTree([tree]);

//   webContents.send(DIR_WATCHER_EVENTS_CHANNEL_NAME, {
//     type: 'TREE',
//     tree: flatTree,
//   });
// };

// export { DIR_WATCHER_EVENTS_CHANNEL_NAME, initDirWatcher };
