import User from "../models/User.model.js"; // Import the Mongoose User model

import mongoose from "mongoose"; // Import mongoose

import { putObject } from "../utils/put-object.js";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.params.id;

    console.log("User ID:", userId);
    console.log("Name:", name);
    console.log("Email:", email);

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (name == "" || email == "") {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Replace your old regex with this:
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Update and return the new document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      message: `New data for ${updatedUser.name} has been updated!`,
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    // Convert req.params.id to a valid ObjectId
    try {
      const userId = new mongoose.Types.ObjectId(req.params.id); // Use 'new'
    } catch (error) {
      return res.status(400).json({ error: "Invalid User ID" });
    }
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadProfilePicture = async (req, res) => {
  const { userId, filename } = req.query;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "No file provided" });
  }

  if (!userId || !filename) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    // Convert to ObjectId
    const objectIdUserId = new mongoose.Types.ObjectId(userId);

    // Upload to S3
    const { url, key } = await putObject(file, filename);

    // Update the user's profilePic field
    const updatedUser = await User.findByIdAndUpdate(
      objectIdUserId,
      { profilePic: url },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePicUrl: url,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        profilePic: updatedUser.profilePic,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
