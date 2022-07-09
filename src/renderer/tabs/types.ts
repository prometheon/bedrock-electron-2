import { EventEmitter } from 'events';
import { WebviewTag } from 'electron';

export interface TabGroupOptions {
  tabContainerSelector?: string;
  buttonsContainerSelector?: string;
  viewContainerSelector?: string;
  tabClass?: string;
  viewClass?: string;
  closeButtonText?: string;
  newTabButtonText?: string;
  newTab?: TabOptions | ((opts?: any) => TabOptions);
  ready?: (tabGroup: ElectronTabGroup) => void;
  visibilityThreshold?: number;
}

export interface TabOptions {
  title?: string;
  src?: string;
  badge?: string;
  iconURL?: string;
  icon?: string;
  closable?: boolean;
  webviewAttributes?: { [key: string]: any };
  visible?: boolean;
  active?: boolean;
  ready?: (tab: ElectronTab) => void;
}

declare class ElectronTabGroup extends EventEmitter {
  constructor(options?: TabGroupOptions);
  options: TabGroupOptions;

  addTab(options?: TabOptions): ElectronTab;
  getTab(id: number): ElectronTab | null;
  getTabByPosition(position: number): ElectronTab | null;
  getTabByRelPosition(position: number): ElectronTab | null;
  getActiveTab(): ElectronTab | null;
  getTabs(): ElectronTab[];
  eachTab<T extends object>(
    fn: (
      this: T,
      currentTab: ElectronTab,
      index: number,
      tabs: ElectronTab[]
    ) => void,
    thisArg?: T
  ): void;
  tabContainer: HTMLElement | null;

  viewContainer: HTMLElement | null;
}

declare class ElectronTab extends EventEmitter {
  constructor(options?: TabOptions);
  options: TabOptions;

  id: number;

  setTitle(title: string): void;
  getTitle(): string | undefined;
  setBadge(badge: string): void;
  getBadge(): string | undefined;
  setIcon(iconURL?: string, icon?: string): void;
  setIcon(iconURL: undefined | null, icon: string): void;
  getIcon(): string | undefined;
  setPosition(position: number): ElectronTab | null;
  getPosition(fromRight?: boolean): number;
  activate(): void;
  show(shown?: boolean): void;
  hide(): void;
  flash(shown?: boolean): void;
  unflash(): void;
  close(force?: boolean): void;
  webview: WebviewTag;
}

export { ElectronTab, ElectronTabGroup };
