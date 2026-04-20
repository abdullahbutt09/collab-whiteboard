const express = require("express");
const { createRoom, getRoom } = require("../controllers/roomController");

const router = express.Router();

router.post("/create", createRoom);
router.get("/:roomId", getRoom);

module.exports = router;
