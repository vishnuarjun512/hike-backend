import express from "express";
import Post from "../models/Post.model.js";
import { deleteFolder, getUploadUrl } from "../utils/s3-client.js";
import User from "../models/User.model.js";

const router = express.Router();

router.post("/getURL", (req, res) => {
  try {
    const { userId, postId, filename, filetype } = req.body;

    const key = filename; // <-- use the full path

    const url = getUploadUrl(process.env.AWS_BUCKET_NAME, key, 60);
    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3-${process.env.AWS_REGION}.amazonaws.com/${key}`;
    res.status(200).json({ uploadUrl: url, imageUrl });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res
      .status(500)
      .json({ message: "Failed to generate upload URL", error: error.message });
  }
});

// Create a Post
router.post("/", async (req, res) => {
  try {
    const { userId, title, content, images } = req.body;
    const newPost = new Post({ userId, title, content, images }); // You missed title in your example

    await newPost.save();
    res
      .status(200)
      .json({ success: true, message: "Post created", post: newPost });
  } catch (error) {
    console.log("Error creating post:", error);
    res
      .status(500)
      .json({ success: false, message: "Error creating post", error });
  }
});

// PATCH /post/:postId
router.patch("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { images } = req.body; // expect an array of image URLs

    if (!Array.isArray(images)) {
      return res
        .status(400)
        .json({ success: false, message: "Images must be an array" });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { images },
      { new: true } // return the updated document
    );

    if (!updatedPost) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    res.json({
      success: true,
      message: "Post images updated",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post images:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update post images", error });
  }
});

// Get posts made only by friends
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find current user and their friends
    const currentUser = await User.findById(userId).select("friends");
    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Include user's own ID in the search
    const friendIds = [
      ...currentUser.friends.map((id) => id.toString()),
      userId,
    ];

    // Find posts made by user or their friends
    const posts = await Post.find({ userId: { $in: friendIds } })
      .sort({ createdAt: -1 })
      .populate("userId", "-password"); // Populate user details except password

    console.log(posts);
    res.json({ success: true, posts });
  } catch (error) {
    console.error("Error fetching friend posts:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching posts", error });
  }
});

// Get a single Post
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    res.json({ success: true, post });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching post", error });
  }
});

// Update a Post
router.put("/:id", async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedPost)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    res.json({ success: true, message: "Post updated", post: updatedPost });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error updating post", error });
  }
});

// Delete a Post
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const bucketName = `hikebucket`;
    const checkPost = await Post.findById(req.params.id);
    if (!checkPost)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    const prefix = `hike/${checkPost.userId}/posts/${id}/`;
    await deleteFolder(prefix, bucketName);

    await Post.findByIdAndDelete(id);

    res.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.log("Error deleting post:", error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting post", error });
  }
});

export default router;
