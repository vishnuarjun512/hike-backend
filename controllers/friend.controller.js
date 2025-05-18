import Friend from "../models/Friend.model.js";
import User from "../models/User.model.js";
import FriendRequest from "../models/FriendRequest.model.js";

export const sendRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    // Check if users exist
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);
    if (!sender || !receiver) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Check if they are already friends
    const areFriends =
      (await Friend.findOne({ userId: senderId, friends: receiverId })) ||
      (await Friend.findOne({ userId: receiverId, friends: senderId }));
    if (areFriends) {
      return res
        .status(409)
        .json({ success: false, message: "Users are already friends." });
    }

    // Check if a request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });
    if (existingRequest) {
      return res
        .status(409)
        .json({ success: false, message: "Friend request already pending." });
    }

    // Create new friend request
    const newRequest = new FriendRequest({
      senderId,
      receiverId,
      status: "pending",
    });
    await newRequest.save();

    res.status(201).json({
      success: true,
      message: "Friend request sent successfully.",
      data: { requestId: newRequest._id },
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send friend request.",
      data: null,
    });
  }
};

export const acceptRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find the friend request
    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ error: "Friend request not found." });
    }

    // Get sender and receiver IDs
    const { senderId, receiverId } = friendRequest;

    // Update status of the friend request to 'accepted'
    friendRequest.status = "accepted";
    await friendRequest.save();

    // Update friend lists for both users
    await Friend.findOneAndUpdate(
      { userId: senderId },
      { $addToSet: { friends: receiverId } },
      { upsert: true }
    );
    await Friend.findOneAndUpdate(
      { userId: receiverId },
      { $addToSet: { friends: senderId } },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Friend request accepted.",
    });
  } catch (error) {
    console.error("Friend Accept failed:", error);
    res.status(400).json({ error: error.message });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find and delete the friend request
    const result = await FriendRequest.findByIdAndDelete(requestId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found.",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "Friend request rejected.",
      data: { requestId },
    });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject friend request.",
      data: null,
    });
  }
};

export const getUserFriends = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user's friend list
    const friendRecord = await Friend.findOne({ userId }).populate({
      path: "friends",
      select: "id name profilePic",
    });

    const friends = friendRecord ? friendRecord.friends : [];

    res.status(200).json({ error: false, friends });
  } catch (error) {
    console.error("Error fetching user friends:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getRecommendedUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user's friend list
    const userFriendRecord = await Friend.findOne({ userId });
    const userFriends = userFriendRecord?.friends || [];

    // Find sent friend requests
    const sentFriendRequests = await FriendRequest.find({
      senderId: userId,
    }).distinct("receiverId");

    // Get users who are NOT the current user, NOT friends, and NOT in friend requests
    const recommendedUsers = await User.find({
      _id: { $nin: [userId, ...userFriends, ...sentFriendRequests] },
    }).select("id name profilePic");

    // If no recommendations available
    if (recommendedUsers.length === 0) {
      return res.status(200).json({
        error: false,
        recommended: [],
        message: "No new users to recommend.",
      });
    }

    res.status(200).json({
      error: false,
      recommended: recommendedUsers,
      message: "Recommended users fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({
      error: true,
      recommended: [],
      message: "An error occurred while fetching recommended users.",
    });
  }
};

export const getRequests = async (req, res) => {
  try {
    const { status, userId } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID provided" });
    }

    const friendRequests = await FriendRequest.find({
      receiverId: userId,
      status,
    }).populate({
      path: "senderId",
      select: "id name profilePic",
    });

    const formattedRequests = friendRequests.map((request) => ({
      requestId: request._id,
      userId: request.senderId._id,
      name: request.senderId.name,
      profileImage: request.senderId.profilePic,
    }));

    return res.status(200).json({ requests: formattedRequests });
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const unfriend = async (req, res) => {
  try {
    const { userId } = req.params;
    const { unfriendId } = req.body;

    // Remove unfriendId from userId's friend list
    const userUpdateResult = await Friend.findOneAndUpdate(
      { userId },
      { $pull: { friends: unfriendId } }
    );

    // Remove userId from unfriendId's friend list
    const unfriendUpdateResult = await Friend.findOneAndUpdate(
      { userId: unfriendId },
      { $pull: { friends: userId } }
    );

    if (!userUpdateResult || !unfriendUpdateResult) {
      return res.status(404).json({
        success: false,
        message: "Could not unfriend user. Friendship record not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Successfully unfriended user.",
    });
  } catch (error) {
    console.error("Error unfriending user:", error);
    res.status(500).json({ error: error.message });
  }
};
