import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  CopyObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const s3Client = new S3Client({
  region: "ap-south-1", // specify your region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
  endpoint: process.env.S3_ENDPOINT,
});

export const fetchS3Folder = async (
  key: string,
  localPath: string
): Promise<void> => {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET ?? "",
      Prefix: key,
    };

    const response = await s3Client.send(new ListObjectsV2Command(params));

    if (response.Contents) {
      await Promise.all(
        response.Contents.map(async (file) => {
          const fileKey = file.Key;
          if (fileKey) {
            const getObjectParams = {
              Bucket: process.env.S3_BUCKET ?? "",
              Key: fileKey,
            };

            const data = await s3Client.send(
              new GetObjectCommand(getObjectParams)
            );
            const fileData = await data.Body?.transformToByteArray();

            if (fileData) {
              const filePath = `${localPath}/${fileKey.replace(key, "")}`;
              await writeFile(filePath, Buffer.from(fileData));

              console.log(`Downloaded ${fileKey} to ${filePath}`);
            }
          }
        })
      );
    }
  } catch (error) {
    console.error("Error fetching folder:", error);
  }
};

export async function copyS3Folder(
  sourcePrefix: string,
  destinationPrefix: string,
  continuationToken?: string
): Promise<void> {
  try {
    const listParams = {
      Bucket: process.env.S3_BUCKET ?? "",
      Prefix: sourcePrefix,
      ContinuationToken: continuationToken,
    };

    const listedObjects = await s3Client.send(
      new ListObjectsV2Command(listParams)
    );

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

    await Promise.all(
      listedObjects.Contents.map(async (object) => {
        if (!object.Key) return;
        const destinationKey = object.Key.replace(
          sourcePrefix,
          destinationPrefix
        );
        const copyParams = {
          Bucket: process.env.S3_BUCKET ?? "",
          CopySource: `${process.env.S3_BUCKET}/${object.Key}`,
          Key: destinationKey,
        };

        await s3Client.send(new CopyObjectCommand(copyParams));
        console.log(`Copied ${object.Key} to ${destinationKey}`);
      })
    );

    if (listedObjects.IsTruncated) {
      await copyS3Folder(
        sourcePrefix,
        destinationPrefix,
        listedObjects.NextContinuationToken
      );
    }
  } catch (error) {
    console.error("Error copying folder:", error);
  }
}

function writeFile(filePath: string, fileData: Buffer): Promise<void> {
  return new Promise(async (resolve, reject) => {
    await createFolder(path.dirname(filePath));

    fs.writeFile(filePath, fileData, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function createFolder(dirName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.mkdir(dirName, { recursive: true }, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

export const saveToS3 = async (
  key: string,
  filePath: string,
  content: string
): Promise<void> => {
  const params = {
    Bucket: process.env.S3_BUCKET ?? "",
    Key: `${key}${filePath}`,
    Body: content,
  };

  await s3Client.send(new PutObjectCommand(params));
};
