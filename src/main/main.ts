/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import {
  app,
  BrowserWindow,
  // globalShortcut,
  shell,
  ipcMain,
  // BrowserView,
  // remote,
} from 'electron';
import MenuBuilder from './menu';
// import { initDirWatcher } from '../utils/dirWatcher';
import getBounds from '../utils/getBounds';
// import resolveHtmlPath from '../utils/resolveHtmlPath';

let newWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

// const installExtensions = async () => {
//   const installer = require('electron-devtools-installer');
//   const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
//   const extensions = ['REACT_DEVELOPER_TOOLS'];
//
//   return installer
//     .default(
//       extensions.map((name) => installer[name]),
//       forceDownload
//     )
//     .catch(console.log);
// };

const windows = new Set();

const createWindow = async () => {
  // if (
  //   process.env.NODE_ENV === 'development' ||
  //   process.env.DEBUG_PROD === 'true'
  // ) {
  //   await installExtensions();
  // }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  // const currentWindow = BrowserWindow.getFocusedWindow();

  //   const preloadPath = (process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true')
  // ? path.join(__dirname, './preload.js') : path.join(process.resourcesPath, 'preload.js');

  newWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    trafficLightPosition: { x: 10, y: 16 },
    webPreferences: {
      preload: `${path.join(__dirname, './preload.js')}`,
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      // enableRemoteModule: true,
    },
  });
  newWindow.maximize();

  newWindow.loadURL(process.env.BASE_URL);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  newWindow.webContents.on('did-finish-load', () => {
    if (!newWindow) {
      throw new Error('"newWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      newWindow.minimize();
    } else {
      newWindow.show();
      newWindow.focus();
    }
    ipcMain.emit('window-did-finish-load', true);
    // eslint-disable-next-line promise/catch-or-return
    // initDirWatcher(newWindow.webContents).then((w) => {
    //   return app?.on('will-quit', w.stop);
    // });
  });

  newWindow.on('resize', function () {
    if (newWindow) {
      const newBounds = getBounds(newWindow);
      const browserViews = newWindow?.getBrowserViews();
      // set BrowserView's bounds explicitly
      browserViews?.forEach((browserView) => {
        browserView.setBounds(newBounds);
      });
    }
  });

  newWindow.on('closed', () => {
    windows.delete(newWindow);
    newWindow = null;
  });

  newWindow.on('focus', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      const menuBuilder = new MenuBuilder(win);
      menuBuilder.buildMenu();
    }
  });

  // Open urls in the user's browser
  newWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();

  windows.add(newWindow);
  return newWindow;
};

/** ***************************
 * Add event listeners...
 **************************** */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// When the last tab is closed, this event is triggered, which will close the tab window
ipcMain.on('close-tabs-window', () => {
  if (newWindow) newWindow.close();
});

// 'open-tab' event comes from bedrock-fabric
ipcMain.on('open-tab', (_e, args) => {
  if (newWindow) newWindow.webContents.send('open-tab', args);
});

// const blockRefresh = () => {
//   const message = () => newWindow.webContents.send('refresh-tab');

//   globalShortcut.register('CommandOrControl+R', message);
//   globalShortcut.register('CommandOrControl+Shift+R', message);
//   globalShortcut.register('F5', message);
//   return true;
// };

// const blockCloseWindow = () => {
//   const message = () => newWindow.webContents.send('close-tab');

//   globalShortcut.register('CommandOrControl+W', message);
//   return true;
// };

// const handleShortcuts = () => {
//   blockRefresh();
//   blockCloseWindow();
// };

// app.whenReady().then(handleShortcuts).then(createWindow).catch(console.log);
app.whenReady().then(createWindow).catch(console.log);

// let link;

const openNewTab = (link: string) => {
  if (newWindow) newWindow.webContents.send('open-tab', { src: link });
};

app.on('open-url', (event, data) => {
  event.preventDefault();
  const link = data.replace('bedrock-app', 'https');
  if (newWindow) {
    openNewTab(link);
  } else {
    ipcMain.on('window-did-finish-load', () => openNewTab(link));
  }
});

app.setAsDefaultProtocolClient('bedrock-app');

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (windows.size === 0) createWindow();
});

ipcMain.on('uncaughtException', (error) => {
  // Handle the error
  console.log('ipcMain Caught Error:', error);
});
