import React, { useCallback, useEffect, useRef, useState } from 'react';
import { shell } from 'electron';
import {
  getViewTitle,
  getViewUrl,
  getViewWebContents,
  setViewTopBound,
  viewRouterPush,
  getWindow,
} from '../../../utils/windowUtils';
import BASE_URL from '../../../utils/base_url';
import minimizeIcon from './minimize.png';
import maximizeIcon from './maximize.png';
import closeIcon from './close.png';

import styles from './Tabs.module.css';

interface Tab {
  icon?: string;
  title: string;
  url: string;
  createdAt: number;
}

function getTimestamp() {
  return new Date().getTime();
}

function Tabs() {
  const [tabs, setTabs] = useState<Tab[]>([
    {
      title: getViewTitle(),
      url: getViewUrl(),
      createdAt: getTimestamp(),
    },
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tabsRef = useRef<any>();
  const [activeTab, setActiveTab] = useState<Tab | null>(tabs[0]);
  const [canGoBack, setCanGoBack] = useState<boolean>(false);

  const updateActiveTab = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (nextTab: any) => {
      setActiveTab((currentActiveTab) => {
        if (!currentActiveTab) {
          return null;
        }

        const nextActiveTab: Tab = {
          ...currentActiveTab,
          ...nextTab,
        };

        setTabs((prevTabs) => {
          const activeTabIndex = prevTabs.findIndex(
            (tab) => tab.createdAt === currentActiveTab.createdAt
          );

          return [
            ...prevTabs.slice(0, activeTabIndex),
            nextActiveTab,
            ...prevTabs.slice(activeTabIndex + 1),
          ];
        });

        return nextActiveTab;
      });
    },
    []
  );

  useEffect(() => {
    const onBedrockEventSignOut = () => {
      if (activeTab) {
        setTabs(() => [activeTab]);

        const webContents = getViewWebContents();

        if (webContents) {
          webContents.session.clearStorageData();
          webContents.loadURL(`${BASE_URL}/finder`);
        }
      }
    };

    window.addElectronListener('bedrock-event-signOut', onBedrockEventSignOut);

    return () => {
      window.removeElectronListener(
        'bedrock-event-signOut',
        onBedrockEventSignOut
      );
    };
  }, [activeTab]);

  useEffect(() => {
    if (!activeTab?.url) {
      return;
    }

    viewRouterPush(activeTab.url);
  }, [activeTab?.url]);

  useEffect(() => {
    const webContents = getViewWebContents();

    if (!webContents) {
      return;
    }

    setCanGoBack(webContents.canGoBack());

    const onPageTitleUpdated = (event: Event, title: string) => {
      updateActiveTab({ title });
    };

    const onPageFavIconUpdated = (event: Event, favicons: string[]) => {
      updateActiveTab({
        icon: favicons[1] || favicons[0] || '',
      });
    };

    const onPageUrlUpdated = (event: Event, url: string) => {
      updateActiveTab({
        url,
      });
    };

    const onPageDidNavigate = (
      event: Event,
      url: string,
      httpResponseCode: number
    ) => {
      if (url.includes('/accounts/SetSID') && httpResponseCode === 400) {
        // workaround of weird error with "Login with Google" leading to the broken page
        // we do redirect only on second hit of this page, otherwise login will not be successful
        webContents.loadURL(`${BASE_URL}/finder`);
      }
    };

    webContents.on('page-title-updated', onPageTitleUpdated);
    webContents.on('page-favicon-updated', onPageFavIconUpdated);
    webContents.on('did-navigate-in-page', onPageUrlUpdated);
    webContents.on('did-navigate', onPageDidNavigate);

    webContents.setWindowOpenHandler(({ url }: { url: string }) => {
      if (url.startsWith(BASE_URL)) {
        const newTab = {
          title: url.replace(BASE_URL, ''),
          url,
          createdAt: getTimestamp(),
        };

        setTabs(() => {
          setActiveTab(newTab);
          return [...tabs, newTab];
        });

        return { action: 'deny' };
      }

      shell.openExternal(url);
      return { action: 'deny' };
    });

    // eslint-disable-next-line consistent-return
    return () => {
      webContents.off('page-title-updated', onPageTitleUpdated);
      webContents.off('page-favicon-updated', onPageFavIconUpdated);
      webContents.off('did-navigate-in-page', onPageUrlUpdated);
      webContents.off('did-navigate', onPageDidNavigate);
    };
  }, [activeTab, tabs, updateActiveTab]);

  useEffect(() => {
    if (tabsRef.current) {
      const height = tabsRef.current.offsetHeight;

      setViewTopBound(height - 1);
    }
  }, [tabs]);

  const onBack = () => {
    const webContents = getViewWebContents();

    if (!webContents) {
      return;
    }

    webContents.goBack();

    setTimeout(() => {
      setCanGoBack(webContents.canGoBack());
    });
  };

  const onTabClick = (event: Event, index: number) => {
    setActiveTab(tabs[index]);
  };

  const onTabCLose = (event: Event, index: number) => {
    const currentTabs = [...tabs];

    if (tabs[index].createdAt === activeTab?.createdAt) {
      setActiveTab(
        currentTabs.length === 1
          ? null
          : currentTabs[index === 0 ? 1 : index - 1]
      );
    }
    currentTabs.splice(index, 1);

    setTabs(currentTabs);
  };

  const onMinimize = () => {
    getWindow().minimize();
  };

  const onMaximize = () => {
    const win = getWindow();

    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  };

  const onClose = () => {
    getWindow().close();
  };

  return (
    <>
      <div
        className={`${styles.Tabs} ${
          window.platform.isMac ? styles.TabsPlatformMac : ''
        } ${window.platform.isWindows ? styles.TabsPlatformWindows : ''}`}
        ref={tabsRef}
      >
        {canGoBack && tabs.length === 1 ? (
          <div
            className={styles.BackButton}
            onClick={onBack}
            title="Go Back to the previous page"
          >
            ⬅
          </div>
        ) : null}

        {tabs.map((tab, index) => (
          <div
            key={tab.createdAt}
            className={`${styles.Tab} ${
              tab.createdAt === activeTab?.createdAt ? styles.TabActive : ''
            } ${tabs.length === 1 ? styles.TabSingle : ''}`}
          >
            {tab.icon && tabs.length > 1 ? (
              <img src={tab.icon} className={styles.TabIcon} alt="tab-icon" />
            ) : null}
            <div
              className={styles.TabTitle}
              onClick={(event) => onTabClick(event, index)}
            >
              {tabs.length > 1 ? tab.title : ''}
            </div>
            <div
              className={styles.TabClose}
              onClick={(event) => onTabCLose(event, index)}
            >
              ✕
            </div>
          </div>
        ))}

        {window.platform.isWindows && (
          <div className={styles.WindowsControls}>
            <button type="button" onClick={onMinimize}>
              <img src={minimizeIcon} alt="" />
            </button>
            <button type="button" onClick={onMaximize}>
              <img src={maximizeIcon} alt="" />
            </button>
            <button type="button" onClick={onClose}>
              <img src={closeIcon} alt="" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default Tabs;
