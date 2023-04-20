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

window.setCSSVariables = (variables) => {
  Object.entries(variables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
};

window.onload = () => {
  const variables = {
    '--w': '1920px',
    '--h': '1080px',
    '--x': `calc(var(--w) * 0.8391)`,
    '--y': `calc(var(--h) * 0.8391)`,
    '--x2': `calc(var(--w) * 0.5)`,
    '--y2': `calc(var(--h) * 0.1609)`,
    '--electronBackground': `radial-gradient(var(--x) var(--y) at var(--x2) var(--y2), #494B50 0, #000000 var(--h))`,
  };
  window.setCSSVariables(variables);
};
