import {
  app,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
} from 'electron';
import BASE_URL from '../utils/base_url';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu(): Menu {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupContextMenu();
    }

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
            label: 'Go Home',
            click: () => {
              view.webContents.loadURL(`${BASE_URL}/finder`);
            },
          },
          {
            label: 'Reload page',
            click: () => {
              view.webContents.reload();
            },
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
            label: 'Inspect Tabs',
            click: () => {
              win.webContents.inspectElement(x, y);

              if (!view) {
                return;
              }

              const bounds = win.getBounds();
              const viewBounds = view?.getBounds();

              view.setBounds({
                x: 0,
                y: viewBounds.y,
                width: bounds.width - 700,
                height: bounds.height - viewBounds.y,
              });
            },
          }
        );

        if (view) {
          menu.push(
            {
              label: 'Inspect element',
              click: () => {
                view.webContents.inspectElement(x, y);
              },
            },
            {
              label: 'Shift view to the bottom',
              click: () => {
                if (!view) {
                  return;
                }

                const bounds = win.getBounds();

                view.setBounds({
                  x: 0,
                  y: Math.ceil(bounds.height / 2),
                  width: bounds.width,
                  height: Math.floor(bounds.height / 2),
                });
              },
            },
            {
              label: 'Clear cache, cookies and reload',
              click: () => {
                view.webContents.session.clearStorageData();
                view.webContents.loadURL(`${BASE_URL}/finder`);
              },
            }
          );
        }
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
    const subMenuFile: DarwinMenuItemConstructorOptions = {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'Command+T',
          click: () => {
            this.mainWindow.webContents.send('new-tab');
          },
        },
      ],
    };
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
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    };
    // const subMenuViewProd: MenuItemConstructorOptions = {
    //   label: 'View',
    //   submenu: [
    //     {
    //       label: 'Reload',
    //       accelerator: 'Command+R',
    //       click: () => {
    //         this.mainWindow.webContents.reload();
    //       },
    //     },
    //     {
    //       label: 'Toggle Full Screen',
    //       accelerator: 'Ctrl+Command+F',
    //       click: () => {
    //         this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
    //       },
    //     },
    //     {
    //       label: 'Toggle Developer Tools',
    //       accelerator: 'Alt+Command+I',
    //       click: () => {
    //         this.mainWindow.webContents.toggleDevTools();
    //       },
    //     },
    //   ],
    // };
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
    const subMenuHelp: MenuItemConstructorOptions = {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click() {
            shell.openExternal('https://electronjs.org');
          },
        },
        {
          label: 'Documentation',
          click() {
            shell.openExternal(
              'https://github.com/electron/electron/tree/master/docs#readme'
            );
          },
        },
        {
          label: 'Community Discussions',
          click() {
            shell.openExternal('https://www.electronjs.org/community');
          },
        },
        {
          label: 'Search Issues',
          click() {
            shell.openExternal('https://github.com/electron/electron/issues');
          },
        },
      ],
    };

    // const subMenuView =
    //   process.env.NODE_ENV === 'development' ||
    //   process.env.DEBUG_PROD === 'true'
    //     ? subMenuViewDev
    //     : subMenuViewProd;

    return [
      subMenuAbout,
      subMenuFile,
      subMenuEdit,
      subMenuViewDev,
      subMenuWindow,
      subMenuHelp,
    ];
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '&File',
        submenu: [
          {
            label: '&Open',
            accelerator: 'Ctrl+O',
          },
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
        ],
      },
      {
        label: '&View',
        submenu: [
          {
            label: '&Reload',
            accelerator: 'Ctrl+R',
            click: () => {
              this.mainWindow.webContents.reload();
            },
          },
          {
            label: 'Toggle &Full Screen',
            accelerator: 'F11',
            click: () => {
              this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
            },
          },
          {
            label: 'Toggle &Developer Tools',
            accelerator: 'Alt+Ctrl+I',
            click: () => {
              this.mainWindow.webContents.toggleDevTools();
            },
          },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click() {
              shell.openExternal('https://electronjs.org');
            },
          },
          {
            label: 'Documentation',
            click() {
              shell.openExternal(
                'https://github.com/electron/electron/tree/master/docs#readme'
              );
            },
          },
          {
            label: 'Community Discussions',
            click() {
              shell.openExternal('https://www.electronjs.org/community');
            },
          },
          {
            label: 'Search Issues',
            click() {
              shell.openExternal('https://github.com/electron/electron/issues');
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}
