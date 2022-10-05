const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('dirEventsChannelName', 'dir-watcher');

contextBridge.exposeInMainWorld(
  'homedir',
  require('os').homedir().replaceAll('\\', '/')
);

contextBridge.exposeInMainWorld('sendToElectron', (channel, ...params) => {
  ipcRenderer.send(channel, ...params);
});

contextBridge.exposeInMainWorld('addElectronListener', (channel, listener) => {
  ipcRenderer.on(channel, listener);
});

contextBridge.exposeInMainWorld('once', (channel, listener) => {
  ipcRenderer.once(channel, listener);
});

contextBridge.exposeInMainWorld(
  'removeElectronListener',
  (channel, listener) => {
    ipcRenderer.removeListener(channel, listener);
  }
);

// -----
// prev implementation

// window.dirEventsChannelName = 'dir-watcher';
// window.homedir = require('os').homedir().replaceAll('\\', '/');
//
// // ipc guide
// // https://www.electronjs.org/docs/latest/api/ipc-main
//
// window.sendToElectron = (channel, ...params) => {
//   ipcRenderer.send(channel, ...params);
// };
//
// window.addElectronListener = (channel, listener) => {
//   ipcRenderer.on(channel, listener);
// };
//
// window.once = (channel, listener) => {
//   ipcRenderer.once(channel, listener);
// };
//
// window.removeElectronListener = (channel, listener) => {
//   ipcRenderer.removeListener(channel, listener);
// };
