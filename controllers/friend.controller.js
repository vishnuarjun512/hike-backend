import Friend from "../models/Friend.model.js";
import User from "../models/User.model.js";
import FriendRequest from "../models/FriendRequest.model.js";

export const getUserFriends = async (req, res) => {
  try {
    const userId = req.params.userId;

    // 1. Get the user and populate their friends
    const user = await User.findById(userId).populate("friends", "-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const friendIds = user.friends.map((f) => f._id.toString());

    // 2. Get all friend requests involving this user (sent or received)
    const friendRequests = await FriendRequest.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate("senderId", "-password")
      .populate("receiverId", "-password");

    // 3. Determine users involved in any request
    const requestedUserIds = new Set(
      friendRequests.flatMap((req) => [
        req.senderId._id.toString(),
        req.receiverId._id.toString(),
      ])
    );
    requestedUserIds.add(userId); // exclude self

    // 4. Get recommended users (not self, not friends, not in any friend request)
    const recommendedFriends = await User.find({
      _id: {
        $nin: [...friendIds, ...Array.from(requestedUserIds)],
      },
    }).select("-password");

    // Done
    return res.status(200).json({
      friends: user.friends,
      friendRequests,
      recommendedFriends,
    });
  } catch (err) {
    console.error("Error fetching friend data:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

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

    const { senderId, receiverId } = friendRequest;

    // Add each user to the other's `friends` array
    await User.findByIdAndUpdate(senderId, {
      $addToSet: { friends: receiverId },
    });

    await User.findByIdAndUpdate(receiverId, {
      $addToSet: { friends: senderId },
    });

    // Delete the friend request
    await FriendRequest.findByIdAndDelete(requestId);

    res.status(200).json({
      success: true,
      message: "Friend request accepted and users are now friends.",
    });
  } catch (error) {
    console.error("Friend Accept failed:", error);
    res.status(500).json({ error: error.message });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ error: "Friend request not found." });
    }

    // Just delete the request
    await FriendRequest.findByIdAndDelete(requestId);

    res.status(200).json({
      success: true,
      message: "Friend request rejected and removed.",
    });
  } catch (error) {
    console.error("Friend Reject failed:", error);
    res.status(500).json({ error: error.message });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ error: "Friend not found." });
    }

    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    res.status(200).json({
      success: true,
      message: "Friend removed successfully.",
    });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({
      error: true,
      message: "An error occurred while removing the friend.",
    });
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
