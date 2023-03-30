import { FileChangeEvent } from 'nsfw';
import { FlatNode, FlatNodes, TreeNode } from './types';

export const flattenTreeNodes = (node: TreeNode): FlatNodes => {
  const { children, name, path } = node;

  const flatNode: FlatNode = {
    id: path,
    foreignId: path,
    name,
    isFolder: node.type === 'directory',
    ...(children && { childrenList: children.map((child) => child.path) }),
  };
  let flatNodes: FlatNodes = { [node.path]: flatNode };

  if (children) {
    children.forEach((child) => {
      flatNodes = { ...flatNodes, ...flattenTreeNodes(child) };
    });
  }

  return flatNodes;
};

export function filterEvents(events: FileChangeEvent[]) {
  const filteredEvents = events.filter((event) => {
    if (event.action === 2) {
      // MODIFIED
      // Ignore modified events
      return false;
    }

    return true;
  });
  return filteredEvents;
}

export function addIdToEvents(events: FileChangeEvent[]) {
  return events.map((event) => {
    const path = `${event.directory}/${
      event?.action === 3 ? event?.oldFile : event?.file
    }`;
    return {
      ...event,
      id: path,
    };
  });
}
