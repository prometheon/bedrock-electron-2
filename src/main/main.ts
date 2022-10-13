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
import { app, BrowserWindow, ipcMain, BrowserView } from 'electron';
import MenuBuilder from './menu';
import { resolveHtmlPath } from '../utils/resolveHtmlPath';

let win: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug');
}

require('@electron/remote/main').initialize();

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

function refreshViewBounds(_win, _view) {
  const bounds = _win.getBounds();
  const viewBounds = _view.getBounds();

  _view.setBounds({
    x: 0,
    y: viewBounds.y,
    width: bounds.width,
    height: bounds.height - viewBounds.y,
  });
}

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

  win = new BrowserWindow({
    show: false,
    icon: getAssetPath('icon.png'),
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 7, y: 6 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.maximize();
  win.loadURL(resolveHtmlPath('index.html'));

  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),

      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
    },
  });
  win.setBrowserView(view);

  view.webContents.loadURL(process.env.BASE_URL);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  win.webContents.on('did-finish-load', () => {
    if (!win) {
      throw new Error('"win" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      win.minimize();
    } else {
      win.show();
      win.focus();
    }
    ipcMain.emit('window-did-finish-load', true);
    // eslint-disable-next-line promise/catch-or-return
    // initDirWatcher(win.webContents).then((w) => {
    //   return app?.on('will-quit', w.stop);
    // });
  });

  win.on('resize', () => {
    if (win) {
      const browserViews = win?.getBrowserViews();

      // set BrowserView's bounds explicitly
      browserViews?.forEach((browserView) => {
        refreshViewBounds(win, browserView);
      });
    }
  });

  win.on('closed', () => {
    windows.delete(win);
    win = null;
  });

  win.on('focus', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      const menuBuilder = new MenuBuilder(focusedWindow);
      menuBuilder.buildMenu();
    }
  });

  // Open urls in the user's browser
  // win.webContents.on('new-window', (event, url) => {
  //   event.preventDefault();
  //   shell.openExternal(url);
  // });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();

  windows.add(win);
  return win;
};

/** ***************************
 * Add event listeners...
 **************************** */

app.on('browser-window-created', (_, window) => {
  require('@electron/remote/main').enable(window.webContents);
});

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// When the last tab is closed, this event is triggered, which will close the tab window
ipcMain.on('close-tabs-window', () => {
  if (win) win.close();
});

// 'open-tab' event comes from bedrock-fabric
ipcMain.on('open-tab', (_e, args) => {
  if (win) win.webContents.send('open-tab', args);
});

// const blockRefresh = () => {
//   const message = () => win.webContents.send('refresh-tab');

//   globalShortcut.register('CommandOrControl+R', message);
//   globalShortcut.register('CommandOrControl+Shift+R', message);
//   globalShortcut.register('F5', message);
//   return true;
// };

// const blockCloseWindow = () => {
//   const message = () => win.webContents.send('close-tab');

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

// const openNewTab = (link: string) => {
//   if (win) win.webContents.send('open-tab', { src: link });
// };

app.on('open-url', (event, data) => {
  event.preventDefault();
  const link = data.replace('bedrock-app', 'https');
  // if (win) {
  //   openNewTab(link);
  // } else {
  //   ipcMain.on('window-did-finish-load', () => openNewTab(link));
  // }

  const view = win?.getBrowserViews()?.[0];

  view?.webContents.loadURL(link);
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
