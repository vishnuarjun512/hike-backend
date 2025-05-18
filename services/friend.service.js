import Friend from "../models/Friend.model.js";
import FriendRequest from "../models/FriendRequest.model.js";
import User from "../models/User.model.js";

export const sendFriendRequest = async (senderId, receiverId) => {
  // Prevent self-friend requests
  if (senderId === receiverId) {
    return {
      success: false,
      message: "You cannot send a friend request to yourself.",
    };
  }

  // Check if both users exist
  const sender = await User.findByPk(senderId);
  const receiver = await User.findByPk(receiverId);

  if (!sender) {
    return { success: false, message: "Sender does not exist." };
  }

  if (!receiver) {
    return { success: false, message: "Receiver does not exist." };
  }

  // Check if a request already exists
  const existingRequest = await FriendRequest.findOne({
    where: { senderId, receiverId },
  });

  if (existingRequest) {
    return { success: false, message: "Friend request already sent." };
  }

  // Create and return the friend request
  const request = await FriendRequest.create({ senderId, receiverId });
  return {
    success: true,
    message: "Friend request sent.",
    receiverName: receiver.name,
  };
};

export const acceptFriendRequest = async (requestId) => {
  const request = await FriendRequest.findByPk(requestId);
  if (!request || request.status !== "pending")
    return { success: false, message: "Request not found or already handled" };

  const { senderId, receiverId } = request;
  console.log(senderId, receiverId);

  const result = await updateFriendList(senderId, receiverId);

  request.status = "accepted";

  await request.destroy(); // Delete the friend request

  return {
    newFriend: { ...result.newFriend },
    success: true,
    message: "Friend request accepted.",
  };
};

export const rejectFriendRequest = async (requestId) => {
  const request = await FriendRequest.findByPk(requestId);

  if (!request || request.status !== "pending")
    return { success: false, message: "Request not found or already handled." };

  request.status = "rejected";
  await request.destroy();
  return { success: true, message: "Friend request rejected." };
};

export const getFriends = async (userId) => {
  const user = await Friend.findOne({ where: { userId } });

  if (!user || !user.friends || user.friends.length === 0) {
    return [];
  }

  const friends = await User.findAll({
    where: { id: user.friends }, // Fetch user details for the friend IDs
    attributes: ["id", "name", "email", "profilePic"], // Select only required fields
  });

  return friends;
};

// Helper function to update friends list
export const updateFriendList = async (userId1, userId2, action = "accept") => {
  const user1 = await Friend.findOne({ where: { userId: userId1 } });
  const user2 = await Friend.findOne({ where: { userId: userId2 } });
  const newFriend = await User.findByPk(userId2);

  if (!user1 || !user2) {
    return { success: false, message: "One of the users not found" };
  }

  if (action === "accept") {
    // Check if they are already friends
    if (user1.friends.includes(userId2) || user2.friends.includes(userId1)) {
      return { success: false, message: "Already friends" };
    }

    // Add the users to each other's friend lists
    user1.friends = [...new Set([...user1.friends, userId2])];
    user2.friends = [...new Set([...user2.friends, userId1])];

    await user1.save();
    await user2.save();
    return {
      newFriend: newFriend.dataValues,
      success: true,
      message: "Friend request accepted",
    };
  }

  if (action === "remove") {
    // Remove the users from each other's friend lists
    user1.friends = user1.friends.filter((id) => id !== userId2);
    user2.friends = user2.friends.filter((id) => id !== userId1);

    await user1.save();
    await user2.save();
    return { success: true, message: "Friend removed" };
  }

  return { success: false, message: "Invalid action" };
};
