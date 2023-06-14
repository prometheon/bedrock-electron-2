// eslint-disable no-nested-ternary

// Moved to UpdateButton in React app

import { useCallback, useEffect, useState } from 'react';
import platformOS from 'platform-detect/os.mjs';
import styles from './NotificationsPanel.module.css';

function NotificationsPanel() {
  const [version, setVersion] = useState<string>('');
  const [downloadStatus, setDownloadStatus] = useState<
    'init' | 'started' | 'error' | 'finished' | 'install'
  >('init');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const onUpdateApp = useCallback(async () => {
    if (!version) {
      return;
    }

    window.sendToElectron('bedrock-event-startNewVersionDownload');
    setDownloadStatus('started');
  }, [version]);

  const onInstall = useCallback(async () => {
    if (!version) {
      return;
    }

    window.sendToElectron('bedrock-event-installNewVersion');
    setDownloadStatus('install');
  }, [version]);

  useEffect(() => {
    const onBedrockEventNewVersion = (_event: any, newVersion: string) => {
      if (
        platformOS.windows ||
        (platformOS.macos && ['x64', 'arm64'].includes(process.arch))
      ) {
        setVersion(newVersion);
      }
    };

    const onBedrockEventNewVersionDownloadProgress = (
      _event: any,
      { percent }: { percent: number }
    ) => {
      setDownloadStatus('started');
      setDownloadProgress(Math.round(percent * 100));
    };

    const onBedrockEventNewVersionDownloadError = () => {
      setDownloadStatus('error');
    };

    const onBedrockEventNewVersionDownloadFinished = () => {
      setDownloadStatus('finished');

      // # bash:
      // hdiutil attach your.dmg # mount downloaded DMG
    };

    window.addElectronListener(
      'bedrock-event-newVersion',
      onBedrockEventNewVersion
    );

    window.addElectronListener(
      'bedrock-event-newVersionDownloadProgress',
      onBedrockEventNewVersionDownloadProgress
    );

    window.addElectronListener(
      'bedrock-event-newVersionDownloadError',
      onBedrockEventNewVersionDownloadError
    );

    window.addElectronListener(
      'bedrock-event-newVersionDownloadFinished',
      onBedrockEventNewVersionDownloadFinished
    );

    return () => {
      window.removeElectronListener(
        'bedrock-event-newVersion',
        onBedrockEventNewVersion
      );

      window.removeElectronListener(
        'bedrock-event-newVersionDownloadProgress',
        onBedrockEventNewVersionDownloadProgress
      );

      window.removeElectronListener(
        'bedrock-event-newVersionDownloadError',
        onBedrockEventNewVersionDownloadError
      );

      window.addElectronListener(
        'bedrock-event-newVersionDownloadFinished',
        onBedrockEventNewVersionDownloadFinished
      );
    };
  }, []);

  if (!version) {
    return null;
  }

  return (
    <div className={styles.NotificationsBar}>
      {['init', 'started', 'error'].includes(downloadStatus) ? (
        <button
          type="button"
          className={`${styles.DownloadButton} ${
            downloadStatus === 'error' ? styles.DownloadButtonError : ''
          }`}
          onClick={onUpdateApp}
          title={
            downloadStatus === 'init'
              ? `New Bedrock App version is out!. Click to update to v${version} now`
              : undefined
          }
          disabled={downloadStatus !== 'init'}
          style={
            downloadStatus === 'started'
              ? {
                  background: `linear-gradient(90deg, #B0FEB0 ${downloadProgress}%,#CCC ${downloadProgress}%)`,
                }
              : {}
          }
        >
          {{
            init: 'Update',
            started: `Downloading ... ${downloadProgress}%`,
            error: 'Failed to download, click to retry',
            finished: '',
            install: '',
          }[downloadStatus] || 'Update'}
        </button>
      ) : null}

      {downloadStatus === 'finished' ? (
        <button
          type="button"
          className={styles.DownloadButton}
          onClick={onInstall}
        >
          Reload and Install
        </button>
      ) : null}
    </div>
  );
}

export default NotificationsPanel;
