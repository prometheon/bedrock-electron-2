import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import restoreIcon from './restore.png';
import closeIcon from './close.png';
import backIcon from './arrow-back.svg';
import bedrockLogoIcon from './bedrock-logo.png';

import styles from './Tabs.module.css';

interface Tab {
  icon?: string;
  title: string;
  url: string;
  createdAt: number;
}

const MIN_FULL_TAB_WIDTH = 72;

function getTimestamp() {
  return new Date().getTime();
}

function TabGeometry() {
  return (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <symbol id="tab-geometry-left" viewBox="0 0 314 36">
          <path d="M17 0h297v36H0v-2c4.5 0 9-3.5 9-8V8c0-4.5 3.5-8 8-8z" />
        </symbol>
        <symbol id="tab-geometry-right" viewBox="0 0 314 36">
          <use xlinkHref="#tab-geometry-left" />
        </symbol>
        <clipPath id="crop">
          <rect
            className={styles.TabGeometryMask}
            width="100%"
            height="100%"
            x="0"
          />
        </clipPath>
      </defs>
      <svg width="52%" height="100%">
        <use
          xlinkHref="#tab-geometry-left"
          width="314"
          height="36"
          className={styles.TabGeometryMaskPart}
        />
      </svg>
      <g transform="scale(-1, 1)">
        <svg width="52%" height="100%" x="-100%" y="0">
          <use
            xlinkHref="#tab-geometry-right"
            width="314"
            height="36"
            className={styles.TabGeometryMaskPart}
          />
        </svg>
      </g>
    </svg>
  );
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
  const [currentTabWidth, setCurrentTabWidth] = useState<number>(9999);

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

  const openTab = useCallback(
    (
      {
        title = '',
        url = '',
        createdAt = getTimestamp(),
        icon = undefined,
      } = {},
      { asFirstTab = false, asActiveTab = false } = {}
    ) => {
      const urlDomain = url.match(/(?:https?:\/\/)*([^/]+\.[^/]+)+\/?/)?.[1];

      const newTab = {
        title: title || urlDomain || '',
        url,
        createdAt,
        icon: icon || `https://icons.duckduckgo.com/ip2/${urlDomain}.ico`,
      };

      setTabs((prevTabs) => {
        return [
          ...(asFirstTab ? [newTab] : []),
          ...prevTabs,
          ...(asFirstTab ? [] : [newTab]),
        ];
      });

      if (asActiveTab) {
        setActiveTab(newTab);
      }
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

    const onBedrockEventOpenTab = (_event: any, url: string) => {
      openTab({ url });
    };

    window.addElectronListener('bedrock-event-signOut', onBedrockEventSignOut);
    window.addElectronListener('bedrock-event-openTab', onBedrockEventOpenTab);

    return () => {
      window.removeElectronListener(
        'bedrock-event-signOut',
        onBedrockEventSignOut
      );

      window.removeElectronListener(
        'bedrock-event-openTab',
        onBedrockEventOpenTab
      );
    };
  }, [openTab, activeTab]);

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
      if (url && url.includes('/accounts/SetSID') && httpResponseCode === 400) {
        // workaround of weird error with "Login with Google" leading to the broken page
        // we do redirect only on second hit of this page, otherwise login will not be successful
        webContents.loadURL(`${BASE_URL}/finder`);
      }
    };

    webContents.on('page-title-updated', onPageTitleUpdated);
    webContents.on('page-favicon-updated', onPageFavIconUpdated);
    webContents.on('did-navigate-in-page', onPageUrlUpdated);
    webContents.on('did-navigate', onPageDidNavigate);

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

    setTimeout(() => {
      requestAnimationFrame(() => {
        setCurrentTabWidth(
          document.querySelector('[data-active-tab]')?.getBoundingClientRect()
            .width || 9999
        );
      });
    }, 0);
  }, [tabs]);

  const onFinderReopen = () => {
    openTab(
      {
        title: 'Finder',
        url: `${BASE_URL}/finder`,
        icon: bedrockLogoIcon,
      },
      { asFirstTab: true, asActiveTab: true }
    );
  };

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

  const isMaximized = () => {
    return getWindow().isMaximized();
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

  const bedrockTabsCount = useMemo(() => {
    return tabs.filter(
      (tab) =>
        tab.url.includes('bedrock.computer') || tab.url.includes('localhost')
    ).length;
  }, [tabs]);

  const tabMaxWidth = useMemo(
    () => `calc(${Math.min(99 / tabs.length, 25)}% + 16px)`,
    [tabs]
  );

  useEffect(() => {
    const MOUSE_MIN_MOVE_TO_DRAG = 5;
    const ELEM_MARGIN = -16;
    let isMouseDown = false;
    let mouseX: number;
    let element: Node | null = null;
    let elementX = 0;
    let elementWidth = 0;
    let elementIndex = -1;
    let tabNodes: Node[] = [];
    let deltaIndex = 0;

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }

      mouseX = event.clientX;
      deltaIndex = 0;

      element = event.path.find((_node) => {
        return _node.getAttribute && _node.getAttribute('data-active-tab');
      });

      if (element) {
        isMouseDown = true;
        tabNodes = Array.from(document.querySelectorAll('[data-active-tab]'));
        elementIndex = tabNodes.indexOf(element);
        elementX = parseInt(element.style.left, 10) || 0;
        elementWidth = element.getBoundingClientRect().width + ELEM_MARGIN;
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDown || event.button !== 0) return;

      const deltaX = event.clientX - mouseX;

      if (Math.abs(deltaX) < MOUSE_MIN_MOVE_TO_DRAG) {
        return;
      }

      deltaIndex = Math.round((elementX + deltaX) / elementWidth);

      if (deltaIndex > 0) {
        deltaIndex = Math.min(deltaIndex, tabNodes.length - 1 - elementIndex);
      }

      if (deltaIndex < 0) {
        deltaIndex = Math.max(deltaIndex, -elementIndex);
      }

      tabNodes.forEach((tabNode, i) => {
        if (i === elementIndex) {
          return;
        }

        if (
          deltaIndex !== 0 &&
          Math.min(elementIndex, elementIndex + deltaIndex) <= i &&
          i <= Math.max(elementIndex, elementIndex + deltaIndex)
        ) {
          tabNode.style.left = `${elementWidth * (deltaIndex > 0 ? -1 : 1)}px`;
        } else {
          tabNode.style.left = `0px`;
        }
      });

      if (element) {
        element.style.left = `${elementX + deltaX}px`;
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      isMouseDown = false;

      if (event.button !== 0) {
        return;
      }

      if (element) {
        if (deltaIndex) {
          element.style.left = `${elementWidth * deltaIndex}px`;
        } else {
          element.style.left = `0px`;
        }
      }

      if (deltaIndex) {
        setTabs((prevTabs) => {
          tabNodes.forEach((tabNode) => {
            tabNode.style.transition = `none`;
            tabNode.style.left = `0px`;
          });

          setTimeout(() => {
            tabNodes.forEach((tabNode) => {
              tabNode.style.transition = ``;
            });
          }, 200);

          if (deltaIndex > 0) {
            return [
              ...prevTabs.slice(0, elementIndex),
              ...prevTabs.slice(
                elementIndex + 1,
                elementIndex + deltaIndex + 1
              ),
              prevTabs[elementIndex],
              ...prevTabs.slice(elementIndex + deltaIndex + 1, prevTabs.length),
            ];
          }

          if (deltaIndex < 0) {
            return [
              ...prevTabs.slice(0, elementIndex + deltaIndex),
              prevTabs[elementIndex],
              ...prevTabs.slice(elementIndex + deltaIndex, elementIndex),
              ...prevTabs.slice(elementIndex + 1, prevTabs.length),
            ];
          }

          return prevTabs;
        });
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div ref={tabsRef}>
      <div
        data-tabs="true"
        className={`${styles.Tabs} ${
          window.platform.isMac ? styles.TabsPlatformMac : ''
        } ${window.platform.isWindows ? styles.TabsPlatformWindows : ''}`}
      >
        {tabs.length > 1 || bedrockTabsCount === 0 ? (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <img
            src={bedrockLogoIcon}
            className={styles.ToolbarButton}
            onClick={onFinderReopen}
            title="Open Bedrock Finder"
            alt="Open Bedrock Finder"
          />
        ) : null}

        {canGoBack && tabs.length === 1 ? (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <img
            src={backIcon}
            className={styles.ToolbarButton}
            onClick={onBack}
            title="Go Back to the previous page"
            alt="Go Back to the previous page"
          />
        ) : null}

        {tabs.length === 1 ? (
          <div className={`${styles.Tab} ${styles.TabSingle} `} />
        ) : null}

        {tabs.length > 1
          ? tabs.map((tab, index) => (
              <div
                key={tab.createdAt}
                className={`${styles.Tab} ${
                  tab.createdAt === activeTab?.createdAt ? styles.TabActive : ''
                }`}
                data-active-tab={
                  tab.createdAt === activeTab?.createdAt ? 'true' : 'false'
                }
                onMouseDown={(event) =>
                  event.button === 0 && onTabClick(event, index)
                }
                style={{ maxWidth: tabMaxWidth, minWidth: tabMaxWidth }}
                title={tab.title}
              >
                <div className={styles.TabDividers} />
                <TabGeometry />

                {tab.icon && currentTabWidth > MIN_FULL_TAB_WIDTH ? (
                  <img
                    src={tab.icon}
                    className={styles.TabIcon}
                    alt="tab-icon"
                  />
                ) : null}

                {currentTabWidth > MIN_FULL_TAB_WIDTH ? (
                  <div className={styles.TabTitle}>{tab.title}</div>
                ) : null}

                <div
                  className={styles.TabClose}
                  onClick={(event) => {
                    onTabCLose(event, index);
                    event.stopPropagation();
                  }}
                />
              </div>
            ))
          : null}
      </div>

      {window.platform.isWindows && (
        <div className={styles.WindowsControls}>
          <button type="button" onClick={onMinimize}>
            <img src={minimizeIcon} alt="" />
          </button>
          <button type="button" onClick={onMaximize}>
            <img src={isMaximized() ? restoreIcon : maximizeIcon} alt="" />
          </button>
          <button type="button" onClick={onClose} data-close-button="true">
            <img src={closeIcon} alt="" />
          </button>
        </div>
      )}

      <div className={styles.TabsBottomSpacer} />
    </div>
  );
}

export default Tabs;
