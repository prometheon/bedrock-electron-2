import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { shell } from 'electron';
import {
  getViewTitle,
  getViewUrl,
  getViewWebContents,
  setViewTopBound,
  viewRouterPush,
} from '../../../utils/windowUtils';
import BASE_URL from '../../../utils/base_url';
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
      if (!activeTab) {
        return;
      }

      setActiveTab((currentActiveTab) => {
        const nextActiveTab: Tab = {
          ...currentActiveTab,
          ...nextTab,
        };

        const activeTabIndex = tabs.findIndex(
          (tab) => tab.createdAt === activeTab.createdAt
        );

        setTabs([
          ...tabs.slice(0, activeTabIndex),
          nextActiveTab,
          ...tabs.slice(activeTabIndex + 1),
        ]);

        return nextActiveTab;
      });
    },
    [activeTab, tabs]
  );

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

    webContents.on('page-title-updated', onPageTitleUpdated);
    webContents.on('page-favicon-updated', onPageFavIconUpdated);
    webContents.on('did-navigate-in-page', onPageUrlUpdated);

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
    };
  }, [tabs, updateActiveTab]);

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

  const onClick = (event: Event, index: number) => {
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

  return (
    <>
      <div className={styles.Tabs} ref={tabsRef}>
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
              onClick={(event) => onClick(event, index)}
            >
              {tab.title}
            </div>
            <div
              className={styles.TabClose}
              onClick={(event) => onTabCLose(event, index)}
            >
              ✕
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default Tabs;
