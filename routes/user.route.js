import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

import mongoose from "mongoose";

const router = express.Router();

router.get("/", authenticateUser, getAllUsers);
router.get("/:id", authenticateUser, getUserById);
router.put("/:id", updateUser);
router.delete("/:id", authenticateUser, deleteUser);

router.post("/updateProfilePic/:userId", async (req, res) => {
  const { userId } = req.params;
  const { uploadedImageUrl } = req.body;
  console.log("User ID:", userId);
  console.log("Uploaded Image URL:", uploadedImageUrl);

  if (!userId || !uploadedImageUrl) {
    return res
      .status(400)
      .json({ success: false, message: "User ID and image URL are required" });
  }

  try {
    // Mongoose Update
    const updatedUser = await mongoose.model("User").findByIdAndUpdate(
      userId, // Use userId directly (assuming it's a string representation of ObjectId)
      { profilePic: uploadedImageUrl },
      { new: true } // To get the updated user object back
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "Profile picture updated!",
      user: updatedUser,
    }); //send back the updated user
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ error: "Failed to update profile picture" });
  }
});

export default router;
