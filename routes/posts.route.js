import express from "express";
import Post from "../models/Post.model.js";

const router = express.Router();

// Create a Post
router.post("/", async (req, res) => {
  try {
    const { userId, content, image } = req.body;
    const newPost = new Post({ userId, content, image });
    await newPost.save();
    res.status(201).json({ success: true, message: "Post created", post: newPost });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating post", error });
  }
});

// Get all Posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching posts", error });
  }
});

// Get a single Post
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching post", error });
  }
});

// Update a Post
router.put("/:id", async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPost) return res.status(404).json({ success: false, message: "Post not found" });
    res.json({ success: true, message: "Post updated", post: updatedPost });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating post", error });
  }
});

// Delete a Post
router.delete("/:id", async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ success: false, message: "Post not found" });
    res.json({ success: true, message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting post", error });
  }
});

export default router;
