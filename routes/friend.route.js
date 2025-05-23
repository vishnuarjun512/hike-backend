import express from "express";

import {
  acceptRequest,
  getUserFriends,
  rejectRequest,
  removeFriend,
  sendRequest,
} from "../controllers/friend.controller.js";

const router = express.Router();

// Get all friends details
router.get("/:userId", getUserFriends);

router.post("/sendFR", sendRequest);

router.get("/accept/:requestId", acceptRequest);
router.put("/reject/:requestId", rejectRequest);
router.delete("/remove/:userId/:friendId", removeFriend);

export default router;
