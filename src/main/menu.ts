import { app, Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron';
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

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    this.reloadPageAction = this.reloadPageAction.bind(this);
    this.toggleDevToolsAction = this.toggleDevToolsAction.bind(this);
    this.goHomeAction = this.goHomeAction.bind(this);
    this.toggleFullScreenAction = this.toggleFullScreenAction.bind(this);
  }

  reloadPageAction() {
    this.mainWindow.getBrowserView()?.webContents?.reload();
  }

  toggleDevToolsAction() {
    this.mainWindow.getBrowserView()?.webContents?.toggleDevTools();
  }

  goHomeAction() {
    this.mainWindow.getBrowserView()?.webContents.loadURL(`${BASE_URL}/finder`);
  }

  toggleFullScreenAction() {
    this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
  }

  buildMenu(): Menu {
    this.setupContextMenu();

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupContextMenu(): void {
    const win = this.mainWindow;
    const view = this.mainWindow.getBrowserView();

    const onContextMenu = (event: Event, props: Electron.ContextMenuParams) => {
      const { x, y } = props;

      const menu = [];

      if (view) {
        menu.push(
          {
            label: 'Inspect',
            click: () => {
              view.webContents.inspectElement(x, y);
            },
          },
          {
            label: 'Reload',
            click: this.reloadPageAction,
          },
          {
            label: 'Go Home',
            click: this.goHomeAction,
          }
        );
      }

      if (
        process.env.NODE_ENV === 'development' ||
        process.env.DEBUG_PROD === 'true'
      ) {
        menu.push(
          { type: 'separator' },
          {
            label: 'Open devTools for Tabs',
            click: () => {
              win.webContents.openDevTools({ mode: 'detach' });
            },
          }
        );

        if (view) {
          menu.push({
            label: 'Clear cache, cookies and reload',
            click: () => {
              view.webContents.session.clearStorageData();
              view.webContents.loadURL(`${BASE_URL}/finder`);
            },
          });
        }

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
      }

      Menu.buildFromTemplate(menu).popup({ window: this.mainWindow });
    };

    win.webContents.on('context-menu', onContextMenu);

    if (view) {
      view.webContents.on('context-menu', onContextMenu);
    }
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

    // const subMenuFile: DarwinMenuItemConstructorOptions = {
    //   label: 'File',
    //   submenu: [
    //     {
    //       label: 'New Tab',
    //       accelerator: 'Command+T',
    //       click: () => {
    //         this.mainWindow.webContents.send('new-tab');
    //       },
    //     },
    //   ],
    // };

    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
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
          label: 'Go Home',
          accelerator: 'Shift+Command+H',
          click: this.goHomeAction,
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
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    };
    // const subMenuHelp: MenuItemConstructorOptions = {
    //   label: 'Help',
    //   submenu: [
    //     {
    //       label: 'Learn More',
    //       click() {
    //         shell.openExternal('https://electronjs.org');
    //       },
    //     },
    //     {
    //       label: 'Documentation',
    //       click() {
    //         shell.openExternal(
    //           'https://github.com/electron/electron/tree/master/docs#readme'
    //         );
    //       },
    //     },
    //     {
    //       label: 'Community Discussions',
    //       click() {
    //         shell.openExternal('https://www.electronjs.org/community');
    //       },
    //     },
    //     {
    //       label: 'Search Issues',
    //       click() {
    //         shell.openExternal('https://github.com/electron/electron/issues');
    //       },
    //     },
    //   ],
    // };

    // const subMenuView =
    //   process.env.NODE_ENV === 'development' ||
    //   process.env.DEBUG_PROD === 'true'
    //     ? subMenuViewDev
    //     : subMenuViewProd;

    return [
      subMenuAbout,
      // subMenuFile,
      subMenuEdit,
      subMenuView,
      subMenuWindow,
      // subMenuHelp,
    ];
  }

  buildDefaultTemplate() {
    return [
      // {
      //   label: '&File',
      //   submenu: [
      //     {
      //       label: '&Open',
      //       accelerator: 'Ctrl+O',
      //     },
      //     {
      //       label: '&Close',
      //       accelerator: 'Ctrl+W',
      //       click: () => {
      //         this.mainWindow.close();
      //       },
      //     },
      //   ],
      // },
      {
        label: '&View',
        submenu: [
          {
            label: '&Reload',
            accelerator: 'Ctrl+R',
            click: this.reloadPageAction,
          },
          {
            label: 'Go &Home',
            accelerator: 'Shift+Ctrl+H',
            click: this.goHomeAction,
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
      // {
      //   label: 'Help',
      //   submenu: [
      //     {
      //       label: 'Learn More',
      //       click() {
      //         shell.openExternal('https://electronjs.org');
      //       },
      //     },
      //     {
      //       label: 'Documentation',
      //       click() {
      //         shell.openExternal(
      //           'https://github.com/electron/electron/tree/master/docs#readme'
      //         );
      //       },
      //     },
      //     {
      //       label: 'Community Discussions',
      //       click() {
      //         shell.openExternal('https://www.electronjs.org/community');
      //       },
      //     },
      //     {
      //       label: 'Search Issues',
      //       click() {
      //         shell.openExternal('https://github.com/electron/electron/issues');
      //       },
      //     },
      //   ],
      // },
    ];
  }
}
