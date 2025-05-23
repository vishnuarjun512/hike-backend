import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js"; // Note: Changed file name to lowercase convention

const router = express.Router();

// REGISTER ROUTE
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists - Mongoose version
    const existingUser = await User.findOne({
      $or: [{ email }, { name: username }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: true, message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user - Mongoose version
    const newUser = await User.create({
      name: username,
      email,
      password: hashedPassword,
    });

    // Remove password from response
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      profilePic: newUser.profilePic,
      createdAt: newUser.createdAt,
    };

    res.status(200).json({
      error: false,
      message: "User registered successfully",
      user: userResponse,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// LOGIN ROUTE
export const login = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    // Find user by email or username - Mongoose version
    const user = await User.findOne({
      $or: [{ email: usernameOrEmail }, { name: usernameOrEmail }],
    });

    if (!user) {
      return res.status(400).json({
        error: true,
        message: "User not found",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid credentials" });
    }

    // Generate JWT token - using _id instead of id
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Response without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      friends: user.friends,
      friendRequests: user.friendRequests,
    };

    res.status(200).json({
      error: false,
      message: "Login successful",
      user: userResponse,
      token, // Optional: send token in response too
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// LOGOUT ROUTE
export const logout = (req, res) => {
  res.clearCookie("token");
  res.json({
    error: false,
    message: "Logged out successfully",
  });
};

export default router;
