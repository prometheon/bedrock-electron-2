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
import os from 'os';
import { app, BrowserWindow, ipcMain, BrowserView } from 'electron';
import MenuBuilder from './menu';
import { resolveHtmlPath } from '../utils/resolveHtmlPath';
import {
  WIN_10_BOUNDS_OFFSET_MAXIMIZED,
  WIN_10_BOUNDS_OFFSET_NORMAL,
  WIN_11_BOUNDS_OFFSET_MAXIMIZED,
  WIN_11_BOUNDS_OFFSET_NORMAL,
} from '../constants';
import BASE_URL from '../utils/base_url';

let win: BrowserWindow | undefined;

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

interface BrowserViewsMap {
  [key: number]: BrowserView;
}

const windows = new Set();
let menuBuilder: MenuBuilder | undefined;
const browserViews: BrowserViewsMap = {};
let lastTopBrowserView: BrowserView | null = null;

function refreshViewBounds(_win?: BrowserWindow, _view?: BrowserView) {
  if (!_win || !_view) {
    return;
  }

  const bounds = _win.getBounds();
  const viewBounds = _view.getBounds();

  let offset = 0;
  if (os.platform() === 'win32') {
    // eslint-disable-next-line no-nested-ternary
    offset = _win.isMaximized()
      ? os.release().startsWith('10.0.22')
        ? WIN_11_BOUNDS_OFFSET_MAXIMIZED
        : WIN_10_BOUNDS_OFFSET_MAXIMIZED
      : os.release().startsWith('10.0.22')
      ? WIN_11_BOUNDS_OFFSET_NORMAL
      : WIN_10_BOUNDS_OFFSET_NORMAL;
  }

  _view.setBounds({
    x: 0,
    y: viewBounds.y,
    width: bounds.width - offset,
    height: bounds.height - viewBounds.y - offset,
  });
}

const createWindow = async () => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  const createBrowserView = (
    url: string,
    {
      createdAt = Date.now(),
      show = false,
    }: { createdAt?: number; show?: boolean } = {}
  ) => {
    if (!win) {
      return;
    }

    const isBedrockUrl =
      url.includes('localhost') || url.includes('bedrock.computer');

    const webPreferences = isBedrockUrl
      ? {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: true,
          contextIsolation: false,
          webviewTag: true,
        }
      : {};

    const browserView = new BrowserView({ webPreferences });
    browserView.setBackgroundColor('#ffffff');
    browserView.webContents.loadURL(url);
    browserViews[createdAt] = browserView;

    browserView.webContents.on(
      'page-title-updated',
      (_event: Event, title: string) => {
        win?.webContents.send('bedrock-event-pageTitleUpdated', {
          createdAt,
          title,
        });
      }
    );

    browserView.webContents.on(
      'page-favicon-updated',
      (_event: Event, favicons: string[]) => {
        win?.webContents.send('bedrock-event-pageFaviconUpdated', {
          createdAt,
          icon: favicons[1] || favicons[0] || '',
        });
      }
    );

    browserView.webContents.on(
      'did-navigate-in-page',
      (_event: Event, nextUrl: string) => {
        win?.webContents.send('bedrock-event-didNavigateInPage', {
          createdAt,
          url: nextUrl,
        });
      }
    );

    browserView.webContents.on(
      'did-navigate',
      (_event: Event, nextUrl: string, httpResponseCode: number) => {
        if (
          nextUrl &&
          nextUrl.includes('/accounts/SetSID') &&
          httpResponseCode === 400
        ) {
          // workaround of weird error with "Login with Google" leading to the broken page
          // we do redirect only on second hit of this page, otherwise login will not be successful
          browserView.webContents.loadURL(`${BASE_URL}/finder`);
        }
      }
    );

    win.addBrowserView(browserView);

    if (show) {
      lastTopBrowserView = browserView;
      menuBuilder?.setTopBrowserView(lastTopBrowserView);
      win.setTopBrowserView(browserView);
    } else if (lastTopBrowserView) {
      win.setTopBrowserView(lastTopBrowserView);
    }

    menuBuilder = new MenuBuilder({
      mainWindow: win,
      mainView: lastTopBrowserView,
    });

    setTimeout(() => {
      if (!win) {
        return;
      }

      // rebuild menu in few seconds, since some menu items are relying on settled page URL, that can be empty on the very start
      menuBuilder = new MenuBuilder({
        mainWindow: win,
        mainView: lastTopBrowserView,
      });
    }, 5000);
  };

  win = new BrowserWindow({
    show: false,
    icon: getAssetPath('icon.png'),
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 8, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.maximize();
  win.loadURL(resolveHtmlPath('index.html'));

  win.webContents.on('did-finish-load', () => {
    if (!win) {
      throw new Error('"win" is not defined');
    }
    win.show();
    win.focus();

    // eslint-disable-next-line promise/catch-or-return
    // initDirWatcher(win.webContents).then((w) => {
    //   return app?.on('will-quit', w.stop);
    // });
  });

  win.on('resize', () => {
    if (win) {
      // set BrowserView's bounds explicitly
      win.getBrowserViews().forEach((view) => {
        refreshViewBounds(win, view);
      });
    }
  });

  win.on('closed', () => {
    windows.delete(win);
    win = undefined;
  });

  win.on('show', () => {
    setTimeout(() => {
      win?.focus();
      const [browserView] = win?.getBrowserViews() || [];
      browserView?.webContents?.focus();
    }, 200);
  });

  win.on('focus', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      menuBuilder = new MenuBuilder({
        mainWindow: focusedWindow,
        mainView: lastTopBrowserView,
      });

      setTimeout(() => {
        lastTopBrowserView?.webContents.focus();
      }, 200);
    }
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();

  ipcMain.on('bedrock-event-signOut', () => {
    win?.webContents.send('bedrock-event-signOut');
  });

  ipcMain.on(
    'bedrock-event-createBrowserView',
    (
      _event,
      {
        url,
        createdAt,
        show = false,
      }: { url: string; createdAt: number; show?: boolean }
    ) => {
      createBrowserView(url, { createdAt, show });
    }
  );

  ipcMain.on(
    'bedrock-event-activateBrowserView',
    (_event, { createdAt }: { createdAt: number }) => {
      if (!browserViews[createdAt]) {
        return;
      }

      win?.addBrowserView(browserViews[createdAt]);
      win?.setTopBrowserView(browserViews[createdAt]);
      lastTopBrowserView = browserViews[createdAt];
      menuBuilder?.setTopBrowserView(lastTopBrowserView);
      browserViews[createdAt].webContents.focus();
    }
  );

  ipcMain.on(
    'bedrock-event-removeBrowserView',
    (
      _event,
      {
        createdAt,
        nextCreatedAt,
      }: { createdAt: number; nextCreatedAt: number | null }
    ) => {
      if (!browserViews[createdAt]) {
        return;
      }

      if (nextCreatedAt && browserViews[nextCreatedAt]) {
        win?.addBrowserView(browserViews[nextCreatedAt]);
        win?.setTopBrowserView(browserViews[nextCreatedAt]);
        lastTopBrowserView = browserViews[nextCreatedAt];
        menuBuilder?.setTopBrowserView(lastTopBrowserView);
      }

      win?.removeBrowserView(browserViews[createdAt]);
      if (lastTopBrowserView === browserViews[createdAt]) {
        lastTopBrowserView = null;
        menuBuilder?.setTopBrowserView(null);
      }
      (browserViews[createdAt].webContents as any).destroy();
      delete browserViews[createdAt];
    }
  );

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

app.whenReady().then(createWindow).catch(console.log);

app.on('open-url', (event, bedrockAppUrl) => {
  event.preventDefault();
  const url = bedrockAppUrl.replace('bedrock-app://', 'https://');
  win?.webContents.send('bedrock-event-openTab', url);
});

app.setAsDefaultProtocolClient('bedrock-app');

app.on('activate', () => {
  // On macOS, it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (windows.size === 0) createWindow();
});

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    const { protocol } = new URL(url);
    if (['https:', 'http:'].includes(protocol)) {
      win?.webContents.send('bedrock-event-openTab', url);
    }
    return { action: 'deny' };
  });
});

ipcMain.on('uncaughtException', (error) => {
  // Handle the error
  console.log('ipcMain Caught Error:', error);
});
