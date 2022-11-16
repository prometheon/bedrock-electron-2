import { BrowserWindow } from '@electron/remote';
import Electron from 'electron';
import os from 'os';

export function getWindow(): Electron.BrowserWindow {
  const [win] = BrowserWindow.getAllWindows();
  return win;
}

export function getView(): Electron.BrowserView | null {
  const win = getWindow();
  return win.getBrowserView();
}

export function getViewWebContents(): Electron.WebContents | null {
  return getView()?.webContents || null;
}

export function getViewTitle() {
  return getViewWebContents()?.getTitle() || '';
}

export function getViewUrl() {
  return getViewWebContents()?.getURL() || '';
}

export function setViewTopBound(topOffset = 0, rightOffset = 0) {
  const win = getWindow();
  const view = getView();
  const widthOffset = os.platform() === 'win32' && win.isMaximized() ? 12 : 0;
  const heightOffset = os.platform() === 'win32' && win.isMaximized() ? 12 : 0;

  const bounds = win.getBounds();
  view?.setBounds({
    x: 0,
    y: topOffset,
    width: bounds.width - rightOffset - widthOffset,
    height: bounds.height - topOffset - heightOffset,
  });
}

export function viewRouterPush(url: string) {
  // `window.routerPush` function must be defined in `bedrock-fabric` repo
  getViewWebContents()?.executeJavaScript(
    `window.routerPush && window.routerPush('${url}')`
  );
}
