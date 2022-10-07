const { ipcRenderer } = require('electron');

window.dirEventsChannelName = 'dir-watcher';
window.homedir = require('os').homedir().replaceAll('\\', '/');

// ipc guide
// https://www.electronjs.org/docs/latest/api/ipc-main

window.sendToElectron = (channel, ...params) => {
  ipcRenderer.send(channel, ...params);
};

window.addElectronListener = (channel, listener) => {
  ipcRenderer.on(channel, listener);
};

window.once = (channel, listener) => {
  ipcRenderer.once(channel, listener);
};

window.removeElectronListener = (channel, listener) => {
  ipcRenderer.removeListener(channel, listener);
};
