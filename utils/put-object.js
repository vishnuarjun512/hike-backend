import { PutObjectCommand } from "@aws-sdk/client-s3";

export const putObject = async (file, fileName) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: "image/jpeg,jpg,png",
      ContentType: "video/mp4,avi,mkv",
      ACL: "public-read",
    };

    const command = new PutObjectCommand(params);

    const data = await s3.send(command);

    if (data.$metadata.httpStatusCode !== 200) {
      console.error("Error uploading file:", data);
      throw new Error("Failed to upload file");
    }
    console.log("File uploaded successfully", data);

    let url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    return { url, key: params.Key };
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: error.message });
  }
};
