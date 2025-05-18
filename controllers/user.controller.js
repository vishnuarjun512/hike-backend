import User from "../models/User.model.js"; // Import the Mongoose User model
import { v4 as uuidv4 } from "uuid";
import path from "path";
import mongoose from "mongoose"; // Import mongoose

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

    // Basic validation
    if (email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Convert req.params.id to a valid ObjectId
    try {
      const userId = new mongoose.Types.ObjectId(req.params.id); // Use 'new'
    } catch (error) {
      return res.status(400).json({ error: "Invalid User ID" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name: name, email: email }, // Specify the fields to update
      { new: true, runValidators: true } //  options: return updated, run validators
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // You can choose to return only selected fields
    res.json({
      message: "New data for " + updatedUser.name + " has been updated!",
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

export const updateUserProfilePicture = async (req, res) => {
  try {
    const userId = req.params.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file provided" });
    }

    // Generate a unique filename
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    const profilePictureUrl = uniqueFilename;

    // Convert userId to ObjectId
    try {
      const objectIdUserId = new mongoose.Types.ObjectId(userId); // Convert to ObjectId
    } catch (error) {
      return res.status(400).json({ error: "Invalid User ID" });
    }

    // Update the user's profilePic field in the database
    const updatedUser = await User.findByIdAndUpdate(
      objectIdUserId,
      { profilePic: profilePictureUrl },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile picture updated successfully",
      profilePictureUrl: profilePictureUrl,
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({
      message: "Failed to update profile picture",
      error: error.message,
    });
  }
};
