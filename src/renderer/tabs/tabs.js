/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
import BASE_URL from '../../utils/base_url';
import { DIR_WATCHER_EVENTS_CHANNEL_NAME } from '../../utils/dirWatcher';
import getBounds from '../../utils/getBounds';

const EventEmitter = require('events');
const { remote, ipcRenderer } = require('electron');
const path = require('path');
const { BrowserView } = require('electron');

if (!document) {
  throw Error('electron-tabs module must be called in renderer process');
}

export default class TabGroup extends EventEmitter {
  constructor(args = {}) {
    super();
    const options = {
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
    };
    this.options = options;
    this.tabContainer = document.querySelector(options.tabContainerSelector);
    this.viewContainer = document.querySelector(options.viewContainerSelector);
    this.tabs = [];
    this.newTabId = 0;
    TabGroupPrivate.initNewTabButton.bind(this)();
    TabGroupPrivate.initVisibility.bind(this)();
    if (typeof this.options.ready === 'function') {
      this.options.ready(this);
    }
  }

  addTab(args = this.options.newTab) {
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

  getTab(id) {
    for (const i in this.tabs) {
      if (this.tabs[i].id === id) {
        return this.tabs[i];
      }
    }
    return null;
  }

  getTabByPosition(position) {
    const fromRight = position < 0;
    for (const i in this.tabs) {
      if (this.tabs[i].getPosition(fromRight) === position) {
        return this.tabs[i];
      }
    }
    return null;
  }

  getTabByRelPosition(position) {
    position = this.getActiveTab().getPosition() + position;
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

  eachTab(fn) {
    this.getTabs().forEach(fn);
    return this;
  }

  getActiveTab() {
    if (this.tabs.length === 0) return null;
    return this.tabs[0];
  }
}

const TabGroupPrivate = {
  initNewTabButton() {
    if (!this.options.newTab) return;
    const container = document.querySelector(
      this.options.buttonsContainerSelector
    );
    const button = container.appendChild(document.createElement('button'));
    button.classList.add(`${this.options.tabClass}-button-new`);
    button.innerHTML = this.options.newTabButtonText;
    button.addEventListener('click', this.addTab.bind(this, undefined), false);
  },

  initVisibility() {
    function toggleTabsVisibility(tab, tabGroup) {
      const { visibilityThreshold } = this.options;
      const el = tabGroup.tabContainer.parentNode;
      if (this.tabs.length >= visibilityThreshold) {
        el.classList.add('visible');
      } else {
        el.classList.remove('visible');
      }
    }

    this.on('tab-added', toggleTabsVisibility);
    this.on('tab-removed', toggleTabsVisibility);
  },

  removeTab(tab, triggerEvent) {
    const { id } = tab;
    for (const i in this.tabs) {
      if (this.tabs[i].id === id) {
        this.tabs.splice(i, 1);
        break;
      }
    }
    if (triggerEvent) {
      this.emit('tab-removed', tab, this);
    }
    return this;
  },

  setActiveTab(tab) {
    TabGroupPrivate.removeTab.bind(this)(tab);
    this.tabs.unshift(tab);
    this.emit('tab-active', tab, this);
    return this;
  },

  activateRecentTab(tab) {
    if (this.tabs.length > 0) {
      this.tabs[0].activate();
    }
    return this;
  },
};

class Tab extends EventEmitter {
  constructor(tabGroup, id, args) {
    super();
    this.tabGroup = tabGroup;
    this.id = id;
    this.title = args.title;
    this.badge = args.badge;
    this.iconURL = args.iconURL;
    this.icon = args.icon;
    this.closable = args.closable !== false;
    this.homeTab = args.homeTab === true;
    this.src = args.src;
    // this.webviewAttributes = args.webviewAttributes || {};
    // this.webviewAttributes.src = args.src;
    this.tabElements = {};
    TabPrivate.initTab.bind(this)();
    TabPrivate.initWebview.bind(this)();
    if (args.visible !== false) {
      this.show();
    }
    if (typeof args.ready === 'function') {
      args.ready(this);
    }
  }

  setTitle(title) {
    if (this.isClosed) return;
    const span = this.tabElements.title;
    span.innerHTML = title;
    span.title = title;
    this.title = title;
    this.emit('title-changed', title, this);
    return this;
  }

  getTitle() {
    if (this.isClosed) return;
    return this.title;
  }

  setBadge(badge) {
    if (this.isClosed) return;
    const span = this.tabElements.badge;
    this.badge = badge;

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
    return this.badge;
  }

  setIcon(iconURL, icon) {
    if (this.isClosed) return;
    this.iconURL = iconURL;
    this.icon = icon;
    const span = this.tabElements.icon;
    if (iconURL) {
      span.innerHTML = `<img src="${iconURL}" />`;
      this.emit('icon-changed', iconURL, this);
    } else if (icon) {
      span.innerHTML = icon;
      // span.innerHTML = `<i class="${icon}"></i>`;
      this.emit('icon-changed', icon, this);
    }

    return this;
  }

  getIcon() {
    if (this.isClosed) return;
    if (this.iconURL) return this.iconURL;
    return this.icon;
  }

  setPosition(newPosition) {
    const { tabContainer } = this.tabGroup;
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

  getPosition(fromRight) {
    let position = 0;
    let { tab } = this;
    while ((tab = tab.previousSibling) != null) position++;

    if (fromRight === true) {
      position -= this.tabGroup.tabContainer.childElementCount;
    }

    if (position >= 0) {
      position++;
    }

    return position;
  }

  refresh() {
    this.browserView.webContents.executeJavaScript('window.location.reload();');
  }

  activate() {
    if (this.isClosed) return;
    const activeTab = this.tabGroup.getActiveTab();
    if (activeTab) {
      activeTab.tab.classList.remove('active');
      // activeTab.webview.classList.remove("visible");
      activeTab.emit('inactive', activeTab);
    }
    TabGroupPrivate.setActiveTab.bind(this.tabGroup)(this);
    // const a = BrowserWindow.getFoc
    const mainWindow = remote.getCurrentWindow();
    mainWindow.setTopBrowserView(this.browserView);
    this.tab.classList.add('active');
    const contents = this.browserView.webContents;
    contents.on('dom-ready', () => {
      this.setTitle(contents.getTitle());
      contents.focus();
      console.log('activate: dom ready!');
    });
    contents.on('page-title-updated', (event, title) => {
      this.setTitle(title);
      console.log('activate: page-title-updated!');
    });
    contents.on('page-favicon-updated', (event, favicons) => {
      this.setIcon(favicons[0], this.icon);
      console.log('activate: page-favicon-updated!', favicons);
    });
    this.emit('active', this);
    return this;
  }

  show(flag) {
    if (this.isClosed) return;
    if (flag !== false) {
      this.tab.classList.add('visible');
      this.emit('visible', this);
    } else {
      this.tab.classList.remove('visible');
      this.emit('hidden', this);
    }
    return this;
  }

  hide() {
    return this.show(false);
  }

  flash(flag) {
    if (this.isClosed) return;
    if (flag !== false) {
      this.tab.classList.add('flash');
      this.emit('flash', this);
    } else {
      this.tab.classList.remove('flash');
      this.emit('unflash', this);
    }
    return this;
  }

  unflash() {
    return this.flash(false);
  }

  hasClass(classname) {
    return this.tab.classList.contains(classname);
  }

  close(force) {
    const abortController = new AbortController();
    const abort = () => abortController.abort();
    this.emit('closing', this, abort);

    const abortSignal = abortController.signal;
    if (this.isClosed || (!this.closable && !force) || abortSignal.aborted)
      return;

    this.isClosed = true;
    const { tabGroup } = this;
    tabGroup.tabContainer.removeChild(this.tab);

    const mainWindow = remote.getCurrentWindow();
    mainWindow.removeBrowserView(this.browserView);
    // tabGroup.viewContainer.removeChild(this.webview);
    const activeTab = this.tabGroup.getActiveTab();
    TabGroupPrivate.removeTab.bind(tabGroup)(this, true);

    this.emit('close', this);

    if (activeTab.id === this.id) {
      TabGroupPrivate.activateRecentTab.bind(tabGroup)();
    }
  }
}

const TabPrivate = {
  initTab() {
    const { tabClass } = this.tabGroup.options;

    // Create tab element
    const tab = (this.tab = document.createElement('div'));
    tab.classList.add(tabClass);
    for (const el of ['icon', 'title', 'buttons', 'badge']) {
      const span = tab.appendChild(document.createElement('span'));
      span.classList.add(`${tabClass}-${el}`);
      this.tabElements[el] = span;
    }

    this.setTitle(this.title);
    this.setBadge(this.badge);
    this.setIcon(this.iconURL, this.icon);
    TabPrivate.initTabButtons.bind(this)();
    TabPrivate.initTabClickHandler.bind(this)();

    this.tabGroup.tabContainer.appendChild(this.tab);
  },

  initTabButtons() {
    const container = this.tabElements.buttons;
    const { tabClass } = this.tabGroup.options;
    if (this.closable) {
      const button = container.appendChild(document.createElement('button'));
      button.classList.add(`${tabClass}-button-close`);
      button.innerHTML = this.tabGroup.options.closeButtonText;
      button.addEventListener('click', this.close.bind(this, false), false);
    }
  },

  initTabClickHandler() {
    // Mouse up
    const tabClickHandler = function (e) {
      if (this.isClosed) return;
      if (e.which === 2) {
        this.close();
      }
    };
    this.tab.addEventListener('mouseup', tabClickHandler.bind(this), false);
    // Mouse down
    const tabMouseDownHandler = function (e) {
      if (this.isClosed) return;
      if (e.which === 1) {
        if (e.target.matches('button')) return;
        this.activate();
      }
    };
    this.tab.addEventListener(
      'mousedown',
      tabMouseDownHandler.bind(this),
      false
    );
  },

  initWebview() {
    // init BrowserView
    const mainWindow = remote.getCurrentWindow();
    const view = new remote.BrowserView({
      webPreferences: {
        webviewTag: true,
        preload: `${path.join(__dirname, './preload.js')}`,
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      },
    });
    mainWindow.addBrowserView(view);
    const winBounds = getBounds(mainWindow);
    view.setBounds(winBounds);
    view.setAutoResize({ horizontal: true });
    this.browserView = view;
    view.setBackgroundColor('#fff');
    if (this.homeTab) {
      view.webContents.loadURL(`${BASE_URL}/finder`);
    } else if (this.src) {
      view.webContents.loadURL(this.src);
    } else {
      view.webContents.loadURL(`${BASE_URL}/new`);
    }
    console.log('Browser Views:', mainWindow.getBrowserViews());
    const contents = view.webContents;
    contents.on('dom-ready', () => {
      this.setTitle(contents.getTitle());
      contents.focus();
    });
    // uncomment for dev
    // contents.on('ipc-message', (event, channel, ...args) => {
    //   console.log('ipc', event, channel, ...args);
    // });
    contents.on('console-message', (event, channel, ...args) => {
      console.log(...args);
    });
    ipcRenderer.on(DIR_WATCHER_EVENTS_CHANNEL_NAME, (event, ...args) =>
      contents.send(DIR_WATCHER_EVENTS_CHANNEL_NAME, ...args)
    );

    ipcRenderer.on('uncaughtException', function (error) {
      // Handle the error
      console.log('ipcRenderer Caught Error:', error);
    });
  },
};
