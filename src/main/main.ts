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
import fs from 'fs';
import os from 'os';
import fetch from 'node-fetch';
import { execSync } from 'child_process';
import { app, BrowserWindow, ipcMain, BrowserView } from 'electron';
import request from 'request';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import progress from 'request-progress';
import { Console } from 'console';
import MenuBuilder from './menu';
import { resolveHtmlPath } from '../utils/resolveHtmlPath';
import {
  WIN_10_BOUNDS_OFFSET_MAXIMIZED,
  WIN_10_BOUNDS_OFFSET_NORMAL,
  WIN_11_BOUNDS_OFFSET_MAXIMIZED,
  WIN_11_BOUNDS_OFFSET_NORMAL,
} from '../constants';
import BASE_URL from '../utils/base_url';
import releasePackage from '../../release/app/package.json';
import LocalFilesWatcher from '../utils/dirWatcher/LocalFilesWatcher';

if (!fs.existsSync(`${app.getPath('home')}/.bedrock`)) {
  fs.mkdirSync(`${app.getPath('home')}/.bedrock`);
}

const mainLogger = new Console({
  stdout: fs.createWriteStream(
    `${app.getPath('home')}/.bedrock/bedrock-log-stdout.txt`
  ),
  stderr: fs.createWriteStream(
    `${app.getPath('home')}/.bedrock/bedrock-log-stderr.txt`
  ),
});

interface VersionSummary {
  version: string;
  binaries: {
    windows: string;
    macos64bit: string;
    macosArm64: string;
  };
}

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

let win: BrowserWindow | undefined;
let newAppVersionOutputPath = '';
const windows = new Set();
let menuBuilder: MenuBuilder | undefined;
const browserViews: BrowserViewsMap = {};
let lastTopBrowserView: BrowserView | null = null;
let newVersionSummary: VersionSummary | null = null;
const localFilesWatcher = new LocalFilesWatcher();

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

function toNumberVersion(version: string) {
  const [, major, minor, patch, , rc] =
    version.match(/(\d+)\.(\d+)\.(\d+)(-RC)?(\d+)?/) || [];

  return (
    parseInt(major, 10) * 1e9 +
    parseInt(minor, 10) * 1e6 +
    parseInt(patch, 10) * 1e3 +
    (parseInt(rc, 10) || 999)
  );
}

async function checkVersion() {
  const versions = await fetch(
    'https://www.bedrock.computer/api/downloads/versions'
  ).then((res: any) => res.json());

  if (!Array.isArray(versions) || !versions[0]) {
    return;
  }

  const { version, binaries } = versions[0];

  if (toNumberVersion(version) > toNumberVersion(releasePackage.version)) {
    newVersionSummary = { version, binaries };
    win?.webContents.send('bedrock-event-newVersion', version);
  }
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
          browserView.webContents.loadURL(`${BASE_URL}/base`);
        }
      }
    );

    // browserView.webContents.on('did-finish-load', () => {
    // });

    browserView.webContents.on('destroyed', () => {
      if (isBedrockUrl) {
        localFilesWatcher.detachWebContents(browserView.webContents);
      }
    });

    win.addBrowserView(browserView);
    if (isBedrockUrl) {
      localFilesWatcher.attachWebContents(browserView.webContents);
    }

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
    trafficLightPosition: { x: 16, y: 16 },
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
    lastTopBrowserView = null;
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
      Object.keys(browserViews).forEach((key) => {
        const keyAsNumber = parseInt(key, 10);
        if (keyAsNumber !== createdAt) {
          browserViews[keyAsNumber].webContents.send(
            'bedrock-event-hideMenus',
            null
          );
        }
      });

      browserViews[createdAt].webContents.focus();
    }
  );

  ipcMain.on(
    'bedrock-event-draggingTab',
    (_event, { createdAt }: { createdAt: number; dragging: boolean }) => {
      if (!browserViews[createdAt]) {
        return;
      }

      browserViews[createdAt].webContents.send('bedrock-event-hideMenus', null);
    }
  );

  ipcMain.on(
    'bedrock-event-showMenu',
    (
      _event,
      {
        createdAt,
        x,
        y,
        type,
      }: { createdAt: number; x: number; y: number; type: 'system' | 'tab' }
    ) => {
      if (!browserViews[createdAt]) {
        console.log('browserView not found', createdAt);
        return;
      }

      browserViews[createdAt].webContents.send('bedrock-event-showMenu', {
        x,
        y,
        type,
      });
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

  ipcMain.on('bedrock-event-startNewVersionDownload', async () => {
    if (!newVersionSummary) {
      return;
    }

    const url =
      os.platform() === 'win32'
        ? newVersionSummary.binaries.windows
        : os.platform() === 'darwin' && process.arch === 'arm64'
        ? newVersionSummary.binaries.macosArm64
        : os.platform() === 'darwin' && process.arch === 'x64'
        ? newVersionSummary.binaries.macos64bit
        : null;

    if (!url) {
      return;
    }

    const filename = url.split('/').pop();
    newAppVersionOutputPath = `${os.tmpdir()}/${filename}`;

    // remove possible duplicated file with prev versions, if found
    fs.rmSync(newAppVersionOutputPath, { force: true });

    progress(request(url))
      .on('progress', (state: any) => {
        win?.webContents.send(
          'bedrock-event-newVersionDownloadProgress',
          state
        );
      })
      .on('error', (err: Error) => {
        // Do something with err
        mainLogger.error(
          `Bedrock main process new version download error: `,
          err
        );
        console.error(`Bedrock main process new version download error: `, err);

        fs.rmSync(newAppVersionOutputPath, { force: true });
        win?.webContents.send('bedrock-event-newVersionDownloadError');
      })
      .on('end', () => {
        win?.webContents.send('bedrock-event-newVersionDownloadFinished');
      })
      .pipe(fs.createWriteStream(newAppVersionOutputPath));
  });

  ipcMain.on('bedrock-event-installNewVersion', async () => {
    if (!newAppVersionOutputPath) {
      return;
    }

    if (os.platform() === 'darwin') {
      const archPostFix = process.arch === 'arm64' ? '-arm64' : '';

      const command = [
        `hdiutil attach ${newAppVersionOutputPath}`,
        `cp -r /Volumes/Bedrock\\ ${newVersionSummary?.version}${archPostFix}/Bedrock.app/ /Applications/Bedrock.app/`,
        `hdiutil unmount /Volumes/Bedrock\\ ${newVersionSummary?.version}${archPostFix}`,
        `rm -rf ${newAppVersionOutputPath}`,
      ].join(' && ');

      try {
        execSync(command, { stdio: 'inherit' });
        app.relaunch();
        app.exit();
      } catch (error) {
        mainLogger.error(`Bedrock main process error: `, error);
        console.error(`Bedrock main process error: `, error);
      }
    }

    if (os.platform() === 'win32') {
      try {
        execSync(newAppVersionOutputPath, { stdio: 'inherit' });
        app.exit();
      } catch (error) {
        mainLogger.error(`Bedrock main process error: `, error);
        console.error(`Bedrock main process error: `, error);
      }
    }
  });

  windows.add(win);
  return win;
};

const createAppVersionChecker = async () => {
  setTimeout(() => {
    checkVersion().catch();
  }, 10000);

  setTimeout(() => {
    createAppVersionChecker();
  }, 120 * 1000);
};

/** ***************************
 * Add event listeners...
 **************************** */

if (process.env.NODE_ENV === 'development' && os.platform() === 'win32') {
  // workaround that prevents runtime error in Windows
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

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

app
  .whenReady()
  .then(createWindow)
  .then(createAppVersionChecker)
  .catch((error) => {
    mainLogger.error(`Bedrock main process error: `, error);
    console.error(`Bedrock main process error: `, error);
  });

app.on('open-url', (event, bedrockAppUrl) => {
  event.preventDefault();
  const url = bedrockAppUrl.replace(
    'bedrock-app://',
    bedrockAppUrl.includes('bedrock-app://localhost') ? 'http://' : 'https://'
  );

  if (windows.size === 0) {
    createWindow()
      .then(() => {
        setTimeout(() => {
          win?.webContents.send('bedrock-event-openTab', url);
        }, 2000);
        return true;
      })
      .catch((error) => {
        mainLogger.error(`Bedrock main process error: `, error);
        console.error(`Bedrock main process error: `, error);
      });
  } else {
    win?.webContents.send('bedrock-event-openTab', url);
  }
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

app.on('will-quit', () => localFilesWatcher.killWatcher());

ipcMain.on('uncaughtException', (error) => {
  // Handle the error
  mainLogger.error(`Bedrock main process error: `, error);
  console.error(`Bedrock main process error: `, error);
});
