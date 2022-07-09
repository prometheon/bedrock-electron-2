import React from 'react';
import { ipcRenderer } from 'electron';
import dragula from 'dragula';
import path from 'path';
import TabGroup from './tabs/tabs';
import BASE_URL from '../utils/base_url';

const preloadPath =
  process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true'
    ? path.join(__dirname, './preload.js')
    : path.join(__dirname, './dist/preload.js');

export default class Tabs extends React.Component {
  componentDidMount() {
    const tabGroup = new TabGroup({
      newTab: {
        title: 'Bedrock',
        src: `${BASE_URL}/new`,
        active: true,
        visible: true,
        webviewAttributes: {
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: preloadPath,
            allowRunningInsecureContent: true,
            webviewTag: true,
          },
        },
      },
      ready: (group) => {
        dragula([group.tabContainer], {
          direction: 'horizontal',
        });
      },
    });

    tabGroup.on('tab-removed', (tab, group) => {
      console.log('removed');
      if (group.getTabs().length < 1) {
        console.log('no tabs left');
        // ipcRenderer.send('close-tabs-window');
        // select Home Finder tab
      }
    });

    tabGroup.addTab({
      title: '',
      visible: true,
      active: true,
      closable: false,
      homeTab: true,
      icon: '☖',
      iconURL: '../src/public/bedrock-logo-big-party-home.png',
      webviewAttributes: {
        preload: preloadPath,
        webPreferences:
          'webviewTag nodeIntegration contextIsolation enableRemoteModule nodeIntegrationInSubFrames allowRunningInsecureContent=1 webSecurity=0',
      },
      src: BASE_URL,
    });

    ipcRenderer.on('refresh-tab', () => {
      const tab = tabGroup.getActiveTab();
      if (tab) {
        tab.refresh();
      }
    });

    ipcRenderer.on('close-tab', () => {
      const tab = tabGroup.getActiveTab();
      if (tab) {
        tab.close();
      }
    });

    ipcRenderer.on('new-tab', (_event, params) => {
      tabGroup.addTab({
        title: 'Bedrock !!',
        visible: true,
        active: true,
        webviewAttributes: {
          preload: preloadPath,
          webPreferences:
            'webviewTag nodeIntegration contextIsolation enableRemoteModule nodeIntegrationInSubFrames allowRunningInsecureContent=1 webSecurity=0',
        },
        src: `${BASE_URL}/new`,
      });
    });

    // from bedrock-fabric - "Entity > ContextMenu > Open in new tab"
    ipcRenderer.on('open-tab', (_event, params) => {
      tabGroup.addTab({
        title: 'Bedrock',
        ...params,
        visible: true,
        active: true,
      });
    });
  }

  render() {
    return <div />;
  }
}
