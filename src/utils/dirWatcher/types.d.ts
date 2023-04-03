import { FileChangeEvent } from 'nsfw';

interface InitWatcherRequest {
  action: 'INIT_WATCHER';
  options: {
    path: string;
  };
}

interface KillWatcherRequest {
  action: 'KILL_WATCHER';
  options: never;
}

interface GetTreeRequest {
  action: 'GET_TREE';
  options: {
    paths: string[];
  };
}

interface GetFileMetadataRequest {
  action: 'GET_FILE_METADATA';
  options: {
    path: string;
  };
}

interface OpenFileRequest {
  action: 'OPEN_FILE';
  options: {
    path: string;
  };
}

type REQEUEST =
  | InitWatcherRequest
  | KillWatcherRequest
  | GetTreeRequest
  | GetFileMetadataRequest
  | OpenFileRequest;

interface DirEvent {
  type: 'DIR_EVENT';
  events: FileChangeEvent[];
}

interface TreeNode {
  path: string;
  name: string;
  type: string;
  children?: TreeNode[];
}

interface FlatNode {
  id: string;
  foreignId: string;
  name: string;
  isFolder?: boolean;
  childrenList?: string[];
}

interface FlatNodes {
  [path: string]: FlatNode;
}
