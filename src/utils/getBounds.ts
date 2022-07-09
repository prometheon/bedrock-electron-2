import { BrowserWindow } from 'electron';
import os from 'os';

export default (window: BrowserWindow) => {
  const newBounds = window?.getBounds();

  // Temporary hack to fix Windows 10 browser window sizing issues until Electron is fixed
  let windowsWidthOffset = 0;
  let windowsHeightOffset = 0;
  if (os.platform() == 'win32' && os.release().startsWith('10.')) {
    windowsWidthOffset = 15;
    windowsHeightOffset = 58;
  }
  return {
    x: 0,
    y: 32,
    width: newBounds.width - windowsWidthOffset,
    height: newBounds.height - 32 - windowsHeightOffset,
  };
};
