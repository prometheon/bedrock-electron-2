import { nativeImage } from 'electron';
import { stat, Stats } from 'fs';
import { basename } from 'path';

function formatMetadata(metadata: Stats) {
  const fileSizeInBytes = metadata.size;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let fileSize = fileSizeInBytes;

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex += 1;
  }

  const formatted = {
    // dev: { name: "Device ID", value: metadata.dev },
    // mode: { name: "Mode", value: metadata.mode },
    // nlink: { name: "Number of hard links", value: metadata.nlink },
    // uid: { name: "User ID", value: metadata.uid },
    // gid: { name: "Group ID", value: metadata.gid },
    // rdev: { name: "Device ID (if special file)", value: metadata.rdev },
    // blksize: { name: "Block size", value: metadata.blksize },
    // ino: { name: "Inode number", value: metadata.ino },
    size: { name: 'Size', value: `${fileSize.toFixed(2)} ${units[unitIndex]}` },
    // blocks: { name: "Number of allocated blocks", value: metadata.blocks },
    atime: {
      name: 'Last accessed at',
      value: new Date(metadata.atime).toLocaleString(),
    },
    mtime: {
      name: 'Last modifiied at',
      value: new Date(metadata.mtime).toLocaleString(),
    },
    ctime: {
      name: 'Last metadata changed at',
      value: new Date(metadata.ctime).toLocaleString(),
    },
    birthtime: {
      name: 'Created at',
      value: new Date(metadata.birthtime).toLocaleString(),
    },
  };
  return formatted;
}

async function localFileData(path: string) {
  const metadata = await new Promise((resolve: (v: Stats) => void, reject) => {
    stat(path, (err, stats) => {
      if (err) {
        console.error(err);
        reject(err);
      }
      resolve(stats);
      return null;
    });
  });

  const icon = nativeImage.createFromPath(path).toPNG();

  return {
    name: basename(path),
    path,
    icon,
    metadata: formatMetadata(metadata),
  };
}

export default localFileData;
