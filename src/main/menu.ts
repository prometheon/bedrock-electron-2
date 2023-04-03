import {
  app,
  Menu,
  BrowserWindow,
  MenuItemConstructorOptions,
  BrowserView,
} from 'electron';
import os from 'os';
import BASE_URL from '../utils/base_url';
import {
  WIN_10_BOUNDS_OFFSET_MAXIMIZED,
  WIN_10_BOUNDS_OFFSET_NORMAL,
  WIN_11_BOUNDS_OFFSET_MAXIMIZED,
  WIN_11_BOUNDS_OFFSET_NORMAL,
} from '../constants';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

let menuBuilderInstance: MenuBuilder;

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  mainView?: BrowserView | null;

  onDestroy?: () => void;

  constructor({
    mainWindow,
    mainView,
  }: {
    prevInstance?: MenuBuilder | null;
    mainWindow: BrowserWindow;
    mainView?: BrowserView | null;
  }) {
    this.buildMenu = this.buildMenu.bind(this);
    this.setTopBrowserView = this.setTopBrowserView.bind(this);
    this.reloadPageAction = this.reloadPageAction.bind(this);
    this.toggleDevToolsAction = this.toggleDevToolsAction.bind(this);
    this.goHomeAction = this.goHomeAction.bind(this);
    this.toggleFullScreenAction = this.toggleFullScreenAction.bind(this);

    // ---

    if (menuBuilderInstance?.onDestroy) {
      menuBuilderInstance?.onDestroy();
    }

    this.mainWindow = mainWindow;
    this.mainView = mainView;

    this.buildMenu();

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    menuBuilderInstance = this;
  }

  buildMenu(): Menu {
    this.onDestroy = this.setupContextMenu();

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setTopBrowserView(mainView?: BrowserView | null) {
    this.mainView = mainView;
  }

  reloadPageAction() {
    this.mainView?.webContents?.reload();
  }

  toggleDevToolsAction() {
    this.mainView?.webContents?.toggleDevTools();
  }

  goHomeAction() {
    this.mainView?.webContents.loadURL(`${BASE_URL}/finder`);
  }

  toggleFullScreenAction() {
    this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
  }

  setupContextMenu(): () => void {
    const win = this.mainWindow;

    const cleanupCallbacks = win.getBrowserViews().map((view: BrowserView) => {
      const url = view.webContents.getURL();
      const isBedrockUrl =
        url.includes('localhost') || url.includes('bedrock.computer');

      const onBrowserViewContextMenu = (
        _event: Event,
        props: Electron.ContextMenuParams
      ) => {
        const { x, y } = props;

        const menu: any[] = [];

        menu.push(
          {
            label: 'Inspect',
            click: () => {
              view.webContents.inspectElement(x, y);
            },
          },
          {
            label: `Reload (current URL: ${view.webContents.getURL()})`,
            click: this.reloadPageAction,
          },
          ...(isBedrockUrl
            ? [
                {
                  label: 'Go Home',
                  click: this.goHomeAction,
                },
              ]
            : [])
        );

        if (
          process.env.NODE_ENV === 'development' ||
          process.env.DEBUG_PROD === 'true'
        ) {
          menu.push({ type: 'separator' });
          menu.push({
            label: 'Clear cache, cookies and reload',
            click: () => {
              view.webContents.session.clearStorageData();
              view.webContents.reload();
            },
          });
        }

        Menu.buildFromTemplate(menu).popup({ window: view as any });
      };

      view.webContents.on('context-menu', onBrowserViewContextMenu);

      return () => {
        if (view?.webContents?.off && !view?.webContents?.isDestroyed()) {
          view?.webContents?.off('context-menu', onBrowserViewContextMenu);
        }
      };
    });

    const onWindowContextMenu = () => {
      const menu: any[] = [];

      menu.push({
        label: 'Open devTools for Tabs',
        click: () => {
          win.webContents.openDevTools({ mode: 'detach' });
        },
      });

      menu.push(
        {
          label: `OS version: ${os.release()}`,
        },
        {
          label: `BOUNDS: ${
            os.release().startsWith('10.0.22')
              ? [WIN_11_BOUNDS_OFFSET_MAXIMIZED, WIN_11_BOUNDS_OFFSET_NORMAL]
              : [WIN_10_BOUNDS_OFFSET_MAXIMIZED, WIN_10_BOUNDS_OFFSET_NORMAL]
          }`,
        }
      );

      Menu.buildFromTemplate(menu).popup({ window: this.mainWindow });
    };

    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      win.webContents.on('context-menu', onWindowContextMenu);
    }

    return () => {
      cleanupCallbacks.forEach((cb) => {
        cb();
      });

      if (
        !win?.isDestroyed() &&
        win?.webContents?.off &&
        !win?.webContents?.isDestroyed()
      ) {
        win.webContents.off('context-menu', onWindowContextMenu);
      }
    };
  }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'Bedrock',
      submenu: [
        {
          label: 'About Bedrock',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: 'Hide Bedrock',
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };

    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        {
          label: 'Redo',
          accelerator: 'Shift+Command+Z',
          selector: 'redo:',
        },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        {
          label: 'Paste',
          accelerator: 'Command+V',
          selector: 'paste:',
        },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    };

    const subMenuView: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: this.reloadPageAction,
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: this.toggleFullScreenAction,
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: this.toggleDevToolsAction,
        },
      ],
    };

    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        {
          label: 'Close',
          accelerator: 'Command+W',
          selector: 'performClose:',
        },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    };

    return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow];
  }

  buildDefaultTemplate() {
    return [
      {
        label: '&View',
        submenu: [
          {
            label: '&Reload',
            accelerator: 'Ctrl+R',
            click: this.reloadPageAction,
          },
          {
            label: 'Toggle &Full Screen',
            accelerator: 'F11',
            click: this.toggleFullScreenAction,
          },
          {
            label: 'Toggle &Developer Tools',
            accelerator: 'Alt+Ctrl+I',
            click: this.toggleDevToolsAction,
          },
        ],
      },
    ];
  }
}
