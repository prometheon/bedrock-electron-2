import { ipcMain } from 'electron';
import dirTree from 'directory-tree';
import { platform } from 'process';
import { exec } from 'child_process';
import nsfw, { NSFW } from 'nsfw';
import localFileData from './LocalFileData';
import type { FlatNodes, DirEvent, REQEUEST } from './types';
import { addIdToEvents, filterEvents, flattenTreeNodes } from './helpers';

const DIR_WATCHER_EVENTS_CHANNEL_NAME = 'dir-watcher';
const ALLOWED_DEPTH = 2;

class LocalFilesWatcher {
  private watcher: NSFW | null = null;

  private webContentsList: Electron.WebContents[] = [];

  constructor() {
    ipcMain.on(DIR_WATCHER_EVENTS_CHANNEL_NAME, (_, options) =>
      this.handleDirWatcherEvents(options)
    );
  }

  attachWebContents = (webContents: Electron.WebContents) => {
    this.webContentsList.push(webContents);
  };

  // TODO: test if this works
  detachWebContents = (webContents: Electron.WebContents) => {
    const index = this.webContentsList.findIndex((wc) => wc === webContents);
    if (index !== -1) {
      this.webContentsList.splice(index, 1);
    }
  };

  initWatcher = async (path: string) => {
    const respond = (
      data: { path?: string; error?: Error },
      ok: boolean,
      watcher?: NSFW
    ) => {
      if (watcher) this.watcher = watcher;
      this.webContentsList.forEach((wc) => {
        wc.send(DIR_WATCHER_EVENTS_CHANNEL_NAME, {
          type: 'INIT_WATCHER_RESPONSE',
          data,
          ok,
        });
      });
    };
    if (!this.watcher) {
      this.initNativeFileSystemEventsWatcher(path)
        .then((watcher) => {
          return respond({ path }, true, watcher);
        })
        .catch((error) => {
          respond({ error }, false);
        });
    } else {
      respond({ path }, true);
    }
  };

  killWatcher = () => {
    this.watcher?.stop();
    this.watcher = null;

    this.webContentsList.forEach((wc) => {
      wc.send(DIR_WATCHER_EVENTS_CHANNEL_NAME, {
        type: 'KILL_WATCHER_RESPONSE',
        data: {},
        ok: true,
      });
    });
  };

  private handleDirWatcherEvents = (data: REQEUEST) => {
    const { action, options } = data;
    switch (action) {
      case 'INIT_WATCHER':
        this.initWatcher(options.path);
        break;
      case 'KILL_WATCHER':
        this.killWatcher();
        break;
      case 'GET_TREE':
        this.sendTree(options.paths);
        break;
      case 'GET_FILE':
        this.sendFileData(options);
        break;
      case 'OPEN_FILE':
        this.openLocalFile(options.path);
        break;
      default:
        break;
    }
  };

  // implement disk access request
  //
  // private requestFullDiskAccess() {
  //     if (process.platform === 'darwin') {
  //         // On macOS, use the "security" command-line utility to add Electron to the Full Disk Access list
  //         require('child_process').execSync('sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain <(echo "cert")');
  //         dialog.showMessageBoxSync({ message: 'Please restart the application to apply the changes.' })
  //     } else if (process.platform === 'win32') {
  //         // On Windows, use the "icacls" command-line utility to add Electron to the AppContainer's ACL list
  //         require('child_process').execSync('icacls %LOCALAPPDATA%\Programs\<Your App Name> /grant:r "ALL APPLICATION PACKAGES":F')
  //         dialog.showMessageBoxSync({ message: 'Please restart the application to apply the changes.' })
  //     } else {
  //         // On Linux, display a message informing the user that they need to manually grant full disk access
  //         dialog.showMessageBoxSync({ message: 'Please grant full disk access to the application manually.' })
  //     }
  // }

  // private checkFullDiskAccess() {
  //     if (process.platform === 'darwin') {
  //         // On macOS, check if Electron is in the Full Disk Access list
  //         const output = require('child_process').execSync('sudo security authorizationdb read system.privilege.admin', { encoding: 'utf-8' })
  //         return output.includes('com.electron.')
  //     } else if (process.platform === 'win32') {
  //         // On Windows, check if the AppContainer has full control over the application folder
  //         const output = require('child_process').execSync('icacls %LOCALAPPDATA%\Programs\<Your App Name>').toString()
  //         return output.includes('ALL APPLICATION PACKAGES:(F)')
  //     } else {
  //         // On Linux, assume that the user has manually granted full disk access
  //         return true
  //     }
  // }

  private sendTree = (paths: string[]) => {
    let finalTree: FlatNodes = {};

    for (let i = 0; i < paths.length; i += 1) {
      const path = paths[i];
      if (path) {
        const tree = dirTree(path, {
          exclude: /.*\/\..*/,
          depth: ALLOWED_DEPTH,
          attributes: ['type', 'extension'],
          normalizePath: true,
        });

        if (tree) {
          const flatNodes = flattenTreeNodes(tree);
          finalTree = { ...finalTree, ...flatNodes };
        }
      }
    }

    this.webContentsList.forEach((wc) => {
      wc.send(DIR_WATCHER_EVENTS_CHANNEL_NAME, {
        type: 'GET_TREE_RESPONSE',
        data: {
          tree: finalTree,
        },
        ok: true,
      });
    });
  };

  private sendFileData = (options: {
    path: string;
    destinationEid: string;
  }) => {
    const fileData = localFileData(options.path);

    this.webContentsList.forEach((wc) => {
      wc.send(DIR_WATCHER_EVENTS_CHANNEL_NAME, {
        type: 'FILE',
        file: fileData,
        ...options,
      });
    });
  };

  private openLocalFile = (path: string) => {
    const command = platform === 'win32' ? 'start' : 'open';
    exec(`${command} "${path}"`);
  };

  private initNativeFileSystemEventsWatcher = async (path: string) => {
    const webContentList = this.webContentsList;

    return nsfw(path, (events) => {
      const filteredEvents = addIdToEvents(filterEvents(events));

      if (filteredEvents.length > 0) {
        webContentList.forEach((wc) => {
          wc.send(DIR_WATCHER_EVENTS_CHANNEL_NAME, {
            type: 'DIR_EVENT',
            events: filteredEvents,
          } as DirEvent);
        });
      }
    }).then((watcher) => {
      watcher.start();
      return watcher;
    });
  };
}

// function isFolderPath(path: string): boolean | null {
//     let isFolder = null;

//     // this is always giving error:
//     // [Error: ENOENT: no such file or directory, stat '/Users/tem/Downloads/wow'] {
//     //     errno: -2,
//     //     code: 'ENOENT',
//     //     syscall: 'stat',
//     //     path: '/Users/tem/Downloads/wow'
//     //   }
//     //   [Error: ENOENT: no such file or directory, stat '/Users/tem/Downloads/asdfsad'] {
//     //     errno: -2,
//     //     code: 'ENOENT',
//     //     syscall: 'stat',
//     //     path: '/Users/tem/Downloads/asdfsad'
//     //   }

//     stat(path, (err, stats) => {
//         if (err) {
//             console.error(err);
//         } else {
//             if (stats.isDirectory()) {
//                 isFolder = true;
//             } else if (stats.isFile()) {
//                 isFolder = false;
//             } else {
//                 console.log(path, 'is not a directory or a file');
//             }
//         }
//     });

//     return isFolder;
// }

export default LocalFilesWatcher;
