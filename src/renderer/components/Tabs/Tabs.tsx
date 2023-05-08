import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactImageFallback from 'react-image-fallback';
import NotificationsPanel from '../NotificationsPanel/NotificationsPanel';
import { getWindow, setViewsTopBound } from '../../../utils/windowUtils';
import BASE_URL from '../../../utils/base_url';
import minimizeIcon from './minimize.png';
import maximizeIcon from './maximize.png';
import restoreIcon from './restore.png';
import closeIcon from './close.png';
import bedrockLogoIcon from './bedrock-logo.svg';
import globeIcon from './globe.svg';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import styles from './Tabs.module.css';
import useLocalStorage from '../../hooks/useLocalStorage';

interface Tab {
  createdAt: number;
  icon?: string;
  title: string;
  url: string;
}

interface TabProps {
  createdAt: number;
  icon?: string;
  title?: string;
  url?: string;
}

const MIN_FULL_TAB_WIDTH = 72;

function isBedrockTab(tab: Tab) {
  if (!tab) {
    return false;
  }

  return tab.url.includes('bedrock.computer') || tab.url.includes('localhost');
}

function Tabs() {
  const [tabs, setTabs] = useLocalStorage<Tab[]>('tabs', [], (initialTabs) => {
    initialTabs.forEach(({ url, createdAt }) => {
      setTimeout(() => {
        window.sendToElectron('bedrock-event-createBrowserView', {
          url,
          createdAt,
        });
      }, 0);
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tabsRef = useRef<any>();

  const [activeTab, setActiveTabRaw] = useLocalStorage<Tab | null>(
    'activeTab',
    tabs[0],
    (initialActiveTab) => {
      if (!initialActiveTab) {
        return;
      }

      setTimeout(() => {
        window.sendToElectron('bedrock-event-activateBrowserView', {
          createdAt: initialActiveTab.createdAt,
        });
      }, 50);
    }
  );
  const setActiveTab = useCallback(
    (nextActiveTab: Tab | null) => {
      if (nextActiveTab === activeTab) {
        return;
      }

      setActiveTabRaw(nextActiveTab);

      if (nextActiveTab) {
        window.sendToElectron('bedrock-event-activateBrowserView', {
          createdAt: nextActiveTab.createdAt,
        });
      }
    },
    [activeTab, setActiveTabRaw]
  );

  const [currentTabWidth, setCurrentTabWidth] = useState<number>(9999);

  const openTab = useCallback(
    (
      { title = '', url = '', createdAt = Date.now(), icon = undefined } = {},
      { asFirstTab = false, asActiveTab = false } = {}
    ) => {
      const urlDomain = url.match(/(?:https?:\/\/)*([^/]+\.[^/]+)+\/?/)?.[1];

      const newTab = {
        title: title || urlDomain || '',
        url,
        createdAt,
        icon:
          icon ||
          (url
            ? `https://icons.duckduckgo.com/ip2/${urlDomain}.ico`
            : globeIcon),
      };

      window.sendToElectron('bedrock-event-createBrowserView', {
        url,
        createdAt,
        show: asActiveTab,
      });

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
    [setActiveTab, setTabs]
  );

  const openBase = useCallback(() => {
    openTab(
      {
        title: 'Base',
        url: `${BASE_URL}/base`,
        icon: bedrockLogoIcon,
      },
      { asFirstTab: false, asActiveTab: true }
    );
  }, [openTab]);

  const findAndUpdateTab = useCallback(
    ({ createdAt, ...nextTabProps }: TabProps) => {
      setTabs((prevTabs) => {
        return prevTabs.map((tab: Tab) => {
          if (tab.createdAt === createdAt) {
            return {
              ...tab,
              ...nextTabProps,
            };
          }

          return tab;
        });
      });

      if (activeTab?.createdAt === createdAt) {
        setActiveTab({ ...activeTab, ...nextTabProps });
      }
    },
    [activeTab, setActiveTab, setTabs]
  );

  useEffect(() => {
    if (!tabs.length) {
      openBase();
    }
  }, [tabs, openBase]);

  useEffect(() => {
    const onBedrockEventSignOut = () => {
      if (!activeTab) {
        return;
      }

      tabs
        .filter(
          (tab) => isBedrockTab(tab) && tab.createdAt !== activeTab.createdAt
        )
        .forEach((tab) => {
          window.sendToElectron('bedrock-event-removeBrowserView', {
            createdAt: tab.createdAt,
            nextCreatedAt: activeTab?.createdAt || null,
          });
        });

      setTabs((prevTabs) =>
        prevTabs.filter(
          (tab) => !isBedrockTab(tab) || tab.createdAt === activeTab.createdAt
        )
      );
    };

    const onBedrockEventOpenTab = (_event: any, url: string) => {
      openTab({ url }, { asActiveTab: true });
    };

    const onBedrockEventPageTitleUpdated = (
      _event: Event,
      { createdAt, title }: { createdAt: number; title: string }
    ) => {
      findAndUpdateTab({ createdAt, title });
    };

    const onBedrockEventPageFaviconUpdated = (
      _event: Event,
      { createdAt, icon }: { createdAt: number; icon: string }
    ) => {
      findAndUpdateTab({ createdAt, icon });
    };

    const onBedrockEventDidNavigateInPage = (
      _event: Event,
      { createdAt, url }: { createdAt: number; url: string }
    ) => {
      findAndUpdateTab({ createdAt, url });
    };

    window.addElectronListener('bedrock-event-signOut', onBedrockEventSignOut);
    window.addElectronListener('bedrock-event-openTab', onBedrockEventOpenTab);
    window.addElectronListener(
      'bedrock-event-pageTitleUpdated',
      onBedrockEventPageTitleUpdated
    );
    window.addElectronListener(
      'bedrock-event-pageFaviconUpdated',
      onBedrockEventPageFaviconUpdated
    );
    window.addElectronListener(
      'bedrock-event-didNavigateInPage',
      onBedrockEventDidNavigateInPage
    );

    return () => {
      window.removeElectronListener(
        'bedrock-event-signOut',
        onBedrockEventSignOut
      );

      window.removeElectronListener(
        'bedrock-event-openTab',
        onBedrockEventOpenTab
      );

      window.removeElectronListener(
        'bedrock-event-pageTitleUpdated',
        onBedrockEventPageTitleUpdated
      );

      window.removeElectronListener(
        'bedrock-event-pageFaviconUpdated',
        onBedrockEventPageFaviconUpdated
      );

      window.removeElectronListener(
        'bedrock-event-didNavigateInPage',
        onBedrockEventDidNavigateInPage
      );
    };
  }, [activeTab, findAndUpdateTab, openTab, setTabs, tabs]);

  useEffect(() => {
    if (tabsRef.current) {
      const height = tabsRef.current.offsetHeight;

      setViewsTopBound(height - 1);
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

  const showTabMenu = useCallback((createdAt: number, x: number, y: number) => {
    window.sendToElectron('bedrock-event-showMenu', {
      createdAt,
      x,
      y,
      type: 'tab',
    });
  }, []);

  const showSystemMenu = useCallback(() => {
    if (activeTab) {
      window.sendToElectron('bedrock-event-showMenu', {
        createdAt: activeTab.createdAt,
        x: 0,
        y: 0,
        type: 'system',
      });
    }
  }, [activeTab]);

  const onTabClick = (_event: MouseEvent, index: number) => {
    if (activeTab?.createdAt === tabs[index].createdAt) {
      const { x, y } = (
        _event.currentTarget as HTMLDivElement
      )?.getBoundingClientRect() || { x: 0, y: 0 };
      showTabMenu(tabs[index].createdAt, x, y);
      return;
    }
    setActiveTab(tabs[index]);
  };

  const onTabClose = (_event: MouseEvent, index: number) => {
    let nextActiveTabIndex = null;
    let nextActiveTab = activeTab;

    if (tabs[index].createdAt === activeTab?.createdAt) {
      if (tabs.length > 1) {
        nextActiveTabIndex = index === 0 ? 1 : index - 1;
      }

      nextActiveTab =
        nextActiveTabIndex !== null ? tabs[nextActiveTabIndex] : null;
      setActiveTab(nextActiveTab);
    }

    setTabs((prevTabs) => prevTabs.filter((_, i) => i !== index));

    window.sendToElectron('bedrock-event-removeBrowserView', {
      createdAt: tabs[index].createdAt,
      nextCreatedAt: nextActiveTab?.createdAt || null,
    });
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
    return tabs.filter(isBedrockTab).length;
  }, [tabs]);

  const tabMaxWidth = useMemo(
    () => `min(${100 / (tabs.length + 2)}%, 22%)`,
    [tabs]
  );

  useEffect(() => {
    const MOUSE_MIN_MOVE_TO_DRAG = 5;
    const ELEM_MARGIN = -16;
    let isMouseDown = false;
    let mouseX: number;
    let element: HTMLElement | undefined;
    let elementX = 0;
    let elementWidth = 0;
    let elementIndex = -1;
    let tabNodes: HTMLElement[] = [];
    let deltaIndex = 0;

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }

      mouseX = event.clientX;
      deltaIndex = 0;

      element = (event as any).path.find(
        (_node: HTMLElement) =>
          _node.getAttribute && _node.getAttribute('data-active-tab')
      );

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

      window.sendToElectron('bedrock-event-draggingTab', {
        createdAt: activeTab?.createdAt,
      });

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
      if (!isMouseDown || event.button !== 0) return;

      isMouseDown = false;

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
              if (tabNode) {
                tabNode.style.transition = ``;
              }
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
  }, [setTabs, activeTab?.createdAt]);

  return (
    <div ref={tabsRef}>
      <div
        data-tabs="true"
        className={`${styles.Tabs} ${
          window.platform.isMac ? styles.TabsPlatformMac : ''
        } ${window.platform.isWindows ? styles.TabsPlatformWindows : ''}`}
      >
        <span onMouseDown={showSystemMenu}>
          <img
            className={styles.ToolbarButton}
            src={bedrockLogoIcon}
            title="Open Bedrock Base"
            alt="Open Bedrock Base"
          />
        </span>
        {tabs.map((tab, index) =>
          tab ? (
            <div
              key={tab.createdAt}
              className={`${styles.Tab} ${
                tab.createdAt === activeTab?.createdAt ? styles.TabActive : ''
              }`}
              data-active-tab={
                tab.createdAt === activeTab?.createdAt ? 'true' : 'false'
              }
              onMouseDown={(event) =>
                event.button === 0 && onTabClick(event as any, index)
              }
              style={{
                maxWidth: tabMaxWidth,
                minWidth: tabMaxWidth,
              }}
              title={tab.title}
            >
              {/* <div className={styles.TabDividers} /> */}
              {/* <TabGeometry /> */}

              {tab.icon ? (
                <ReactImageFallback
                  src={tab.icon}
                  fallbackImage={globeIcon}
                  className={styles.TabIcon}
                  alt={`icon for ${tab.title}` || `tab ${index} icon`}
                />
              ) : null}

              {currentTabWidth > MIN_FULL_TAB_WIDTH ? (
                <div className={styles.TabTitle}>{tab.title}</div>
              ) : null}

              {tab.createdAt === activeTab?.createdAt &&
              isBedrockTab(tab) &&
              tab.url.includes('b=') ? (
                <div className={styles.TabChevron} />
              ) : null}

              {tabs.length > 1 ? (
                <div
                  className={styles.TabClose}
                  onMouseDown={(event) => {
                    if (event.button === 0) {
                      onTabClose(event as any, index);
                      event.stopPropagation();
                    }
                  }}
                />
              ) : null}
            </div>
          ) : null
        )}
        <div className={styles.TabNew} onClick={openBase} />
        {/* <span onClick={openBase}>
          <img
            className={styles.ToolbarButton}
            src={bedrockLogoIcon}
            title="Open Bedrock Base"
            alt="Open Bedrock Base"
          />
        </span> */}
      </div>

      <NotificationsPanel />

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

      {/* <div className={styles.TabsBottomSpacer} /> */}
    </div>
  );
}

export default Tabs;
