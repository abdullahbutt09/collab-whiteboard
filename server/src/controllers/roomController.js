const Room = require("../models/Room");
const mongoose = require("mongoose");
const { generateRoomId } = require("../utils/roomId");
const { getRoomUsers, ensureRoomMeta, getRoomMeta, getRoomMessages, setRoomMessages } = require("../utils/memoryStore");

async function createRoom(req, res) {
  try {
    const roomId = generateRoomId();

    if (mongoose.connection.readyState === 1) {
      const room = await Room.create({ roomId, users: [] });
      return res.status(201).json({ roomId: room.roomId, createdAt: room.createdAt });
    }

    const room = ensureRoomMeta(roomId);
    return res.status(201).json({ roomId: room.roomId, createdAt: room.createdAt });
  } catch (error) {
    return res.status(500).json({ message: "Unable to create room", error: error.message });
  }
}

async function getRoom(req, res) {
  try {
    const { roomId } = req.params;
    let room = null;

    if (mongoose.connection.readyState === 1) {
      room = await Room.findOne({ roomId }).lean();
    } else {
      room = getRoomMeta(roomId);
    }

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const activeUsers = getRoomUsers(roomId);
    let messages = getRoomMessages(roomId);

    if (mongoose.connection.readyState === 1) {
      messages = room.chatMessages || [];
      setRoomMessages(roomId, messages);
    }

    return res.status(200).json({
      roomId,
      users: activeUsers,
      chatMessages: messages,
      createdAt: room.createdAt,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch room", error: error.message });
  }
}

module.exports = {
  createRoom,
  getRoom,
};
