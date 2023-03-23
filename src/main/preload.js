const { ipcRenderer } = require('electron');
const os = require('os');

window.dirEventsChannelName = 'dir-watcher';
window.homedir = os.homedir().replaceAll('\\', '/');
window.platform = {
  isMac: os.platform() === 'darwin',
  isWindows: os.platform() === 'win32',
  isLinux: os.platform() === 'linux',
};
let niceOSName = 'Unknown';
if (window.platform.isMac) {
  niceOSName = 'MacOS';
} else if (window.platform.isWindows) {
  niceOSName = 'Windows';
} else if (window.platform.isLinux) {
  niceOSName = 'Linux';
}
const { username } = os.userInfo();
window.deviceInfo = {
  username,
  os: niceOSName,
};

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
