const fs = require('fs');
const path = require('path');
const S3 = require('aws-sdk/clients/s3');

const s3 = new S3({
  accessKeyId: process.env.AWS_ID_APP_DOWNLOADS_BUCKET,
  secretAccessKey: process.env.AWS_SECRET_APP_DOWNLOADS_BUCKET,
});

const buildPath = path.join(process.cwd(), 'release', 'build');

const targetFiles = fs
  .readdirSync(buildPath)
  .filter((filename) => filename.endsWith('.exe') || filename.endsWith('.dmg'))
  .map((filename) => ({ filename, filepath: path.join(buildPath, filename) }));

targetFiles.forEach(({ filename, filepath }) => {
  const fileStream = fs.createReadStream(filepath);
  fileStream.on('error', (err) => {
    throw err;
  });

  const params = {
    Bucket: 'bedrock-apps',
    Key: `BedrockApp/${filename.replace(/\s/g, '-')}`,
    Body: fileStream,
    ContentType: filename.endsWith('.exe')
      ? 'application/x-msdownload'
      : 'application/octet-stream',
  };

  s3.upload(params, (err, data) => {
    if (err) {
      throw err;
    }
  });
});
