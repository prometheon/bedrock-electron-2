declare global {
  interface Window {
    sendToElectron: (channelName: string, params?: any) => void;
    addElectronListener: (
      channelName: string,
      cb: (e: Event, data: any) => void
    ) => void;
    removeElectronListener: (
      channelName: string,
      cb: (e: Event, data: any) => void
    ) => void;
    homedir: string;
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production';
      BASE_URL: string;
      ANALYZE?: 'true';
      PORT?: string;
      MAIN_ARGS?: string;
      CI?: 'true';
      APPLE_ID?: string;
      APPLE_ID_PASS?: string;
      DEBUG_PROD?: 'true';
      UPGRADE_EXTENSIONS?: 'true';
      START_MINIMIZED?: 'true';
      E2E_BUILD?: 'true';
    }
  }
}

export {};
