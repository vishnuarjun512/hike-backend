import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import AWS from "aws-sdk";
// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Your access key
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Your secret key
  region: process.env.AWS_REGION || "ap-south-1", // Your region
  signatureVersion: "v4",
});

const s3 = new AWS.S3();

export const getUploadUrl = (bucketName, key, expiresInSeconds = 300) => {
  // This generates a presigned URL for PUT (upload)
  return s3.getSignedUrl("putObject", {
    Bucket: bucketName,
    Key: key,
    Expires: expiresInSeconds,
  });
};

export const deleteFolder = async (prefix, bucketName) => {
  const s3v2 = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  // List all objects with the prefix
  const listedObjects = await s3v2.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    })
  );

  if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
    console.log("No objects found to delete.");
    return;
  }

  // Prepare delete request
  const deleteParams = {
    Bucket: bucketName,
    Delete: {
      Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
      // You can also add Quiet: true here if you want fewer logs
    },
  };

  // Delete objects
  await s3v2.send(new DeleteObjectsCommand(deleteParams));

  console.log(`Deleted all objects under prefix: ${prefix}`);
};
