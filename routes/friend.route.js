import express from "express";
import * as friendController from "../controllers/friend.controller.js";

const router = express.Router();

router.post("/send", friendController.sendRequest);

router.get("/accept/:requestId", friendController.acceptRequest);
router.delete("/decline/:requestId", friendController.rejectRequest);

router.post("/unfriend/:userId", friendController.unfriend);

// Get all friends
router.get("/friends/:userId", friendController.getUserFriends);

// Get recommended users for a user
router.get("/recommendations/:userId", friendController.getRecommendedUsers);

// Get Requests for a user
router.post("/friendRequests", friendController.getRequests);

export default router;
