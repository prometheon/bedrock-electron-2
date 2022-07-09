// import { EventEmitter } from "events";
import {
  ElectronTab,
  ElectronTabGroup,
  TabOptions,
  TabGroupOptions,
} from './types';
/**
 * Forked from electron-tabs to convert to BrowserView
 */

if (!document) {
  throw Error('electron-tabs module must be called in renderer process');
}

// Inject styles
(function () {
  const styles = `
    webview {
      position: absolute;
      visibility: hidden;
      width: 100%;
      height: 100%;
    }
    webview.visible {
      visibility: visible;
    }
  `;
  const styleTag = document.createElement('style');
  styleTag.innerHTML = styles;
  document.getElementsByTagName('head')[0].appendChild(styleTag);
})();

class TabGroup extends ElectronTabGroup {
  tabs: Tab[];

  newTabId: number;

  constructor(args: TabGroupOptions = {}) {
    super();
    const options: TabGroupOptions = (this.options = {
      tabContainerSelector: args.tabContainerSelector || '.etabs-tabs',
      buttonsContainerSelector:
        args.buttonsContainerSelector || '.etabs-buttons',
      viewContainerSelector: args.viewContainerSelector || '.etabs-views',
      tabClass: args.tabClass || 'etabs-tab',
      viewClass: args.viewClass || 'etabs-view',
      closeButtonText: args.closeButtonText || '&#215;',
      newTab: args.newTab,
      newTabButtonText: args.newTabButtonText || '&#65291;',
      visibilityThreshold: args.visibilityThreshold || 0,
      ready: args.ready,
    });
    this.tabContainer = document.querySelector(
      options.tabContainerSelector as string
    );
    this.viewContainer = document.querySelector(
      options.viewContainerSelector as string
    );
    this.tabs = [];
    this.newTabId = 0;
    this.initNewTabButton.bind(this);
    this.initVisibility.bind(this);
    if (typeof this.options.ready === 'function') {
      this.options.ready(this);
    }
  }

  initNewTabButton = () => {
    if (!this.options.newTab) return;
    if (this.options.buttonsContainerSelector) {
      const container = document.querySelector(
        this.options.buttonsContainerSelector
      );
      if (container) {
        const button = container.appendChild(document.createElement('button'));
        button.classList.add(`${this.options.tabClass}-button-new`);
        button.innerHTML = this.options.newTabButtonText || 'default';
        button.addEventListener(
          'click',
          this.addTab.bind(this, undefined),
          false
        );
      }
    }
  };

  initVisibility = () => {
    const self = this;
    function toggleTabsVisibility(tab: Tab, tabGroup: TabGroup) {
      const { visibilityThreshold } = self.options;
      if (self.tabContainer) {
        const el = self.tabContainer.parentNode as HTMLElement;
        if (
          el &&
          visibilityThreshold &&
          self.tabs.length >= visibilityThreshold
        ) {
          el.classList.add('visible');
        } else if (el) el.classList.remove('visible');
      }
    }

    this.on('tab-added', toggleTabsVisibility);
    this.on('tab-removed', toggleTabsVisibility);
  };

  addTab(opts?: TabOptions) {
    let args = opts || this.options.newTab || {};
    if (typeof args === 'function') {
      args = args(this);
    }
    const id = this.newTabId;
    this.newTabId++;
    const tab = new Tab(this, id, args);
    this.tabs.push(tab);
    // Don't call tab.activate() before a tab is referenced in this.tabs
    if (args.active === true) {
      tab.activate();
    }
    this.emit('tab-added', tab, this);
    return tab;
  }

  getTab(id: number) {
    for (const i in this.tabs) {
      if (this.tabs[i].id === id) {
        return this.tabs[i];
      }
    }
    return null;
  }

  getTabByPosition(position: number) {
    const fromRight = position < 0;
    for (const i in this.tabs) {
      if (this.tabs[i].getPosition(fromRight) === position) {
        return this.tabs[i];
      }
    }
    return null;
  }

  getTabByRelPosition(position: number) {
    position = (this.getActiveTab()?.getPosition() || 0) + position;
    if (position <= 0) {
      return null;
    }
    return this.getTabByPosition(position);
  }

  getNextTab() {
    return this.getTabByRelPosition(1);
  }

  getPreviousTab() {
    return this.getTabByRelPosition(-1);
  }

  getTabs() {
    return this.tabs.slice();
  }

  eachTab(fn: any) {
    this.getTabs().forEach(fn);
    return this;
  }

  getActiveTab() {
    if (this.tabs.length === 0) return null;
    return this.tabs[0];
  }
}

class Tab extends ElectronTab {
  tab: HTMLElement | undefined;

  tabGroup: TabGroup;

  tabElements: any;

  options: TabOptions;

  // @mss: Check that this shouldn't be true
  isClosed = false;

  constructor(tabGroup: TabGroup, id: number, args: TabOptions) {
    super();
    this.tabGroup = tabGroup;
    this.id = id;
    this.options = args;
    this.tabElements = {};
    this.initTab.bind(this)();
    this.initTabButtons.bind(this);
    this.initTabClickHandler.bind(this);
    this.initWebview.bind(this);
    if (args.visible !== false) {
      this.show();
    }
    if (typeof args.ready === 'function') {
      args.ready(this);
    }
  }

  initTab = () => {
    const { tabClass } = this.tabGroup.options;

    // Create tab element
    const tab = (this.tab = document.createElement('div'));
    if (tabClass) tab.classList.add(tabClass);
    for (const el of ['icon', 'title', 'buttons', 'badge']) {
      const span = tab.appendChild(document.createElement('span'));
      span.classList.add(`${tabClass}-${el}`);
      this.tabElements[el] = span;
    }
    this.tabGroup.tabContainer?.appendChild(this.tab);
  };

  initTabButtons = () => {
    const container = this.tabElements.buttons;
    const { tabClass } = this.tabGroup.options;
    if (this.options.closable) {
      const button = container.appendChild(document.createElement('button'));
      button.classList.add(`${tabClass}-button-close`);
      button.innerHTML = this.tabGroup.options.closeButtonText;
      button.addEventListener('click', this.close.bind(this, false), false);
    }
  };

  initTabClickHandler = () => {
    // Mouse up
    const self = this;
    const tabClickHandler = function (e: UIEvent) {
      if (self.isClosed) return;
      if (e.which === 2) {
        self.close();
      }
    };
    if (this.tab) {
      this.tab.addEventListener('mouseup', tabClickHandler.bind(this), false);
      // Mouse down
      const tabMouseDownHandler = function (e: any) {
        if (self.isClosed) return;
        if (e.which === 1) {
          if (e.target.matches('button')) return;
          self.activate();
        }
      };
      this.tab.addEventListener(
        'mousedown',
        tabMouseDownHandler.bind(this),
        false
      );
    }
  };

  initWebview = () => {
    const webview = (this.webview = document.createElement('webview'));
    const self = this;
    const tabWebviewDidFinishLoadHandler = function () {
      self.emit('webview-ready', self);
    };

    this.webview.addEventListener(
      'did-finish-load',
      tabWebviewDidFinishLoadHandler.bind(this),
      false
    );

    const tabWebviewDomReadyHandler = function () {
      // Remove this once https://github.com/electron/electron/issues/14474 is fixed
      webview.blur();
      webview.focus();
      self.emit('webview-dom-ready', self);
    };

    this.webview.addEventListener(
      'dom-ready',
      tabWebviewDomReadyHandler.bind(this),
      false
    );

    if (this.tabGroup.options.viewClass)
      this.webview.classList.add(this.tabGroup.options.viewClass);
    if (this.options.webviewAttributes) {
      const attrs = this.options.webviewAttributes;
      for (const key in attrs) {
        const attr = attrs[key];
        if (attr === false) continue;
        this.webview.setAttribute(key, attr);
      }
    }

    this.tabGroup.viewContainer?.appendChild(this.webview);
  };

  removeTab = (tab: Tab, triggerEvent?: any) => {
    const { id } = tab;
    // @BJ: this is probably super janky:
    let i: any;
    for (i in this.tabGroup.tabs) {
      if (this.tabGroup.tabs[i].id === id) {
        this.tabGroup.tabs.splice(i, 1);
        break;
      }
    }
    if (triggerEvent) {
      this.emit('tab-removed', tab, this);
    }
    return this;
  };

  setActiveTab = (tab: Tab) => {
    this.removeTab(tab);
    this.tabGroup.tabs.unshift(tab);
    this.emit('tab-active', tab, this);
    return this;
  };

  activateRecentTab = (tab?: Tab) => {
    if (this.tabGroup.tabs.length > 0) {
      this.tabGroup.tabs[0].activate();
    }
    return this;
  };

  setTitle(title: string) {
    if (this.isClosed) return;
    const span = this.tabElements.title;
    span.innerHTML = title;
    span.title = title;
    this.options.title = title;
    this.emit('title-changed', title, this);
    return this;
  }

  getTitle() {
    if (this.isClosed) return;
    return this.options.title;
  }

  setBadge(badge: string) {
    if (this.isClosed) return;
    const span = this.tabElements.badge;
    this.options.badge = badge;

    if (badge) {
      span.innerHTML = badge;
      span.classList.remove('hidden');
    } else {
      span.classList.add('hidden');
    }

    this.emit('badge-changed', badge, this);
  }

  getBadge() {
    if (this.isClosed) return;
    return this.options.badge;
  }

  setIcon(iconURL?: string | null, icon?: string | null) {
    if (this.isClosed) return;
    const span = this.tabElements.icon;
    if (iconURL) {
      this.options.iconURL = iconURL;
      span.innerHTML = `<img src="${iconURL}" />`;
      this.emit('icon-changed', iconURL, this);
    } else if (icon) {
      this.options.icon = icon;
      span.innerHTML = `<i class="${icon}"></i>`;
      this.emit('icon-changed', icon, this);
    }
  }

  getIcon() {
    if (this.isClosed) return;
    if (this.options.iconURL) return this.options.iconURL;
    return this.options.icon;
  }

  setPosition(newPosition: number): ElectronTab {
    const { tabContainer } = this.tabGroup;
    if (tabContainer == null) return this;
    const tabs = tabContainer.children;
    const oldPosition = this.getPosition() - 1;

    if (newPosition < 0) {
      newPosition += tabContainer.childElementCount;

      if (newPosition < 0) {
        newPosition = 0;
      }
    } else {
      if (newPosition > tabContainer.childElementCount) {
        newPosition = tabContainer.childElementCount;
      }

      // Make 1 be leftmost position
      newPosition--;
    }

    if (newPosition > oldPosition) {
      newPosition++;
    }

    tabContainer.insertBefore(tabs[oldPosition], tabs[newPosition]);

    return this;
  }

  getPosition(fromRight?: boolean) {
    let position = 0;
    let { tab } = this;
    while (tab && (tab = tab.previousSibling as HTMLElement)) position++;

    if (fromRight === true && this.tabGroup.tabContainer?.childElementCount) {
      position -= this.tabGroup.tabContainer.childElementCount;
    }

    if (position >= 0) {
      position++;
    }

    return position;
  }

  activate() {
    if (this.isClosed) return;
    const activeTab = this.tabGroup.getActiveTab();
    if (activeTab) {
      activeTab.tab?.classList.remove('active');
      activeTab.webview.classList.remove('visible');
      activeTab.emit('inactive', activeTab);
      this.setActiveTab(activeTab);
    }
    this.tab?.classList.add('active');
    this.webview.classList.add('visible');
    this.webview.focus();
    this.emit('active', this);
    return this;
  }

  show(flag?: boolean) {
    if (this.isClosed) return;
    if (flag !== false) {
      this.tab?.classList.add('visible');
      this.emit('visible', this);
    } else {
      this.tab?.classList.remove('visible');
      this.emit('hidden', this);
    }
    return this;
  }

  hide() {
    return this.show(false);
  }

  flash(flag?: boolean) {
    if (this.isClosed) return;
    if (flag !== false) {
      this.tab?.classList.add('flash');
      this.emit('flash', this);
    } else {
      this.tab?.classList.remove('flash');
      this.emit('unflash', this);
    }
    return this;
  }

  unflash() {
    return this.flash(false);
  }

  hasClass(classname: string) {
    return this.tab?.classList.contains(classname);
  }

  close(force?: boolean) {
    const abortController = new AbortController();
    const abort = () => abortController.abort();
    this.emit('closing', this, abort);

    const abortSignal = abortController.signal;
    if (
      this.isClosed ||
      (!this.options.closable && !force) ||
      abortSignal.aborted
    )
      return;

    this.isClosed = true;
    const { tabGroup } = this;
    if (this.tab) tabGroup.tabContainer?.removeChild(this.tab);
    tabGroup.viewContainer?.removeChild(this.webview);
    const activeTab = this.tabGroup.getActiveTab();
    this.removeTab(this, true);

    this.emit('close', this);

    if (activeTab && activeTab.id === this.id) {
      // @BJ: used to be:
      // tabGroup.activateRecentTab();
      // seems these methods should be attahced to tabGroup, not Tab
      this.activateRecentTab();
    }
  }
}

// module.exports = TabGroup;
export default TabGroup;
