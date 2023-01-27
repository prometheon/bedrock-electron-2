import { BrowserWindow } from '@electron/remote';
import Electron from 'electron';
import os from 'os';
import {
  WIN_10_BOUNDS_OFFSET_MAXIMIZED,
  WIN_10_BOUNDS_OFFSET_NORMAL,
  WIN_11_BOUNDS_OFFSET_MAXIMIZED,
  WIN_11_BOUNDS_OFFSET_NORMAL,
} from '../constants';

export function getWindow(): Electron.BrowserWindow {
  const [win] = BrowserWindow.getAllWindows();
  return win;
}

export function setViewsTopBound(topOffset = 0, rightOffset = 0) {
  const win = getWindow();

  let offset = 0;
  if (os.platform() === 'win32') {
    // eslint-disable-next-line no-nested-ternary
    offset = win.isMaximized()
      ? os.release().startsWith('10.0.22')
        ? WIN_11_BOUNDS_OFFSET_MAXIMIZED
        : WIN_10_BOUNDS_OFFSET_MAXIMIZED
      : os.release().startsWith('10.0.22')
      ? WIN_11_BOUNDS_OFFSET_NORMAL
      : WIN_10_BOUNDS_OFFSET_NORMAL;
  }

  const bounds = win.getBounds();

  win.getBrowserViews().forEach((view) => {
    view.setBounds({
      x: 0,
      y: topOffset,
      width: bounds.width - rightOffset - offset,
      height: bounds.height - topOffset - offset,
    });
  });
}
