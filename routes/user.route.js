import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";
import AWS from "aws-sdk";
import User from "../models/User.model.js";

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Your access key
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Your secret key
  region: process.env.AWS_REGION || "ap-south-1", // Your region
  signatureVersion: "v4",
});

const s3 = new AWS.S3();

const getUploadUrl = (bucketName, key, expiresInSeconds = 300) => {
  // This generates a presigned URL for PUT (upload)
  return s3.getSignedUrl("putObject", {
    Bucket: bucketName,
    Key: key,
    Expires: expiresInSeconds,
  });
};

const router = express.Router();

router.get("/", authenticateUser, getAllUsers);
router.get("/:id", authenticateUser, getUserById);
router.put("/:id", updateUser);
router.delete("/:id", authenticateUser, deleteUser);

router.post("/getUploadUrl", (req, res) => {
  const { userId } = req.body;

  const key = `hike/${userId}/profilePic/${userId}-profilePic`;
  const bucket = process.env.AWS_BUCKET_NAME;

  try {
    const uploadUrl = getUploadUrl(bucket, key, 60); // URL valid for 60 seconds

    const profilePicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3-${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({ uploadUrl, profilePicUrl });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res
      .status(500)
      .json({ message: "Failed to generate upload URL", error: error.message });
  }
});

router.post("/updateProfilePic", async (req, res) => {
  try {
    const { userId, profilePicUrl } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: profilePicUrl },
      { new: true }
    );
    if (!updatedUser) {
      return res
        .status(500)
        .json({ message: "Failed to update profile picture" });
    }

    res.status(200).json({
      message: "Profile picture uploaded successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({
      message: "Failed to upload profile picture",
      error: error.message,
    });
  }
});

export default router;
