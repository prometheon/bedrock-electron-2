const fs = require('fs');
const path = require('path');
const S3 = require('aws-sdk/clients/s3');

async function s3Upload() {
  const s3 = new S3({
    accessKeyId: process.env.AWS_ID_APP_DOWNLOADS_BUCKET,
    secretAccessKey: process.env.AWS_SECRET_APP_DOWNLOADS_BUCKET,
  });

  const { Contents } = await s3
    .listObjectsV2({
      Bucket: 'bedrock-apps',
      Delimiter: '/',
      Prefix: 'BedrockApp/',
    })
    .promise();

  const bucketContents = Contents.filter((file) => !file.Key.endsWith('/'))
    .filter((file) => !file.Key.includes('-RC')) // exclude RC versions, allow to re-upload them
    .map((file) => file.Key);

  const buildPath = path.join(process.cwd(), 'release', 'build');

  const targetFiles = fs
    .readdirSync(buildPath)
    .filter(
      (filename) => filename.endsWith('.exe') || filename.endsWith('.dmg')
    )
    .map((filename) => ({
      filename,
      filepath: path.join(buildPath, filename),
    }));

  await Promise.all(
    targetFiles.map(
      ({ filename, filepath }) =>
        new Promise((resolve, reject) => {
          const fileStream = fs.createReadStream(filepath);
          fileStream.on('error', (err) => {
            // eslint-disable-next-line no-console
            console.error(err);
            reject(err);
          });

          const normalizedFilename = filename.replace(/\s/g, '-');
          const fileKey = `BedrockApp/${normalizedFilename}`;

          if (bucketContents.includes(fileKey)) {
            resolve(true);
            // eslint-disable-next-line no-console
            console.log(
              `File ${normalizedFilename} already exists in the bucket, skipping it`
            );
          }

          if (!bucketContents.includes(fileKey)) {
            const params = {
              Bucket: 'bedrock-apps',
              Key: fileKey,
              Body: fileStream,
              ContentType: filename.endsWith('.exe')
                ? 'application/x-msdownload'
                : 'application/octet-stream',
            };

            s3.upload(params, (err, data) => {
              if (err) {
                // eslint-disable-next-line no-console
                console.error(err);
                reject(err);
                return;
              }

              resolve(data);
              // eslint-disable-next-line no-console
              console.log(
                `File ${normalizedFilename} was uploaded successfully`
              );
            });
          }
        })
    )
  )
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('\nAll files were processed successfully');
      return true;
    })
    .catch((err) => {
      throw err;
    });
}

s3Upload().catch((err) => {
  throw err;
});
