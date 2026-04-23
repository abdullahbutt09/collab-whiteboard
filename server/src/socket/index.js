const Room = require("../models/Room");
const CanvasState = require("../models/CanvasState");
const mongoose = require("mongoose");
const {
  ensureRoomMeta,
  getRoomUsers,
  setRoomUsers,
  getRoomElements,
  setRoomElements,
  getRoomMessages,
  setRoomMessages,
  addRoomMessage,
} = require("../utils/memoryStore");

const CHAT_HISTORY_LIMIT = 100;
const roomVoiceUsers = new Map();

function getRoomVoiceUsers(roomId) {
  return roomVoiceUsers.get(roomId) || new Set();
}

function setRoomVoiceUsers(roomId, users) {
  roomVoiceUsers.set(roomId, users);
}

async function ensureRoom(roomId) {
  ensureRoomMeta(roomId);

  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const room = await Room.findOne({ roomId });
  if (!room) {
    await Room.create({ roomId, users: [] });
  }
}

function upsertElement(elements, incomingElement) {
  const existingIndex = elements.findIndex((item) => item.id === incomingElement.id);
  if (existingIndex === -1) {
    return [...elements, incomingElement];
  }

  const updated = [...elements];
  updated[existingIndex] = incomingElement;
  return updated;
}

async function persistElements(roomId, elements) {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  await CanvasState.findOneAndUpdate(
    { roomId },
    { roomId, elements },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    let currentRoom = null;
    let currentVoiceRoom = null;

    socket.on("JOIN_ROOM", async ({ roomId, userId }) => {
      if (!roomId) {
        return;
      }

      try {
        await ensureRoom(roomId);
        socket.join(roomId);
        currentRoom = roomId;

        const users = Array.from(new Set([...getRoomUsers(roomId), socket.id]));
        setRoomUsers(roomId, users);

        if (mongoose.connection.readyState === 1) {
          await Room.findOneAndUpdate({ roomId }, { users }, { returnDocument: 'after' });
        }

        let existing = null;
        let room = null;
        if (mongoose.connection.readyState === 1) {
          room = await Room.findOne({ roomId }).lean();
          existing = await CanvasState.findOne({ roomId }).lean();
        }

        const cachedElements = getRoomElements(roomId);
        const elements = (existing && existing.elements) || cachedElements || [];
        setRoomElements(roomId, elements);

        const cachedMessages = getRoomMessages(roomId);
        const chatMessages = (room && room.chatMessages) || cachedMessages || [];
        setRoomMessages(roomId, chatMessages);

        socket.emit("SYNC_DRAW", { elements });
        socket.emit("SYNC_CHAT_HISTORY", { messages: chatMessages });
        socket.to(roomId).emit("USER_JOINED", { socketId: socket.id, userId: userId || socket.id });
      } catch (error) {
        console.error("JOIN_ROOM failed:", error.message);
      }
    });

    socket.on("DRAW", async ({ roomId, element }) => {
      if (!roomId || !element) {
        return;
      }

      const elements = upsertElement(getRoomElements(roomId), element);
      setRoomElements(roomId, elements);
      await persistElements(roomId, elements);

      socket.to(roomId).emit("SYNC_DRAW", { element });
    });

    socket.on("UPDATE_ELEMENT", async ({ roomId, element }) => {
      if (!roomId || !element) {
        return;
      }

      const elements = upsertElement(getRoomElements(roomId), element);
      setRoomElements(roomId, elements);
      await persistElements(roomId, elements);

      socket.to(roomId).emit("SYNC_UPDATE", { element });
    });

    socket.on("DELETE_ELEMENT", async ({ roomId, elementId }) => {
      if (!roomId || !elementId) {
        return;
      }

      const elements = getRoomElements(roomId).filter((item) => item.id !== elementId);
      setRoomElements(roomId, elements);
      await persistElements(roomId, elements);

      socket.to(roomId).emit("SYNC_DELETE", { elementId });
    });

    socket.on("CURSOR_MOVE", ({ roomId, cursor }) => {
      if (!roomId || !cursor) {
        return;
      }

      socket.to(roomId).emit("SYNC_CURSOR", { socketId: socket.id, cursor });
    });

    socket.on("CLEAR_CANVAS", async ({ roomId }) => {
      if (!roomId) {
        return;
      }

      setRoomElements(roomId, []);
      await persistElements(roomId, []);
      io.to(roomId).emit("SYNC_CLEAR");
    });

    socket.on("SCENE_CHANGE", async ({ roomId, elements }) => {
      if (!roomId || !Array.isArray(elements)) {
        return;
      }

      setRoomElements(roomId, elements);
      await persistElements(roomId, elements);
      socket.to(roomId).emit("SYNC_SCENE", { elements });
    });

    socket.on("SEND_CHAT_MESSAGE", async ({ roomId, message }) => {
      if (!roomId || !message) {
        return;
      }

      const text = typeof message.text === "string" ? message.text.trim() : "";
      const userId = typeof message.userId === "string" && message.userId.trim() ? message.userId.trim() : "anonymous";

      if (!text) {
        return;
      }

      const normalizedMessage = {
        id: message.id || `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        text,
        userId,
        createdAt: message.createdAt || new Date().toISOString(),
      };

      const messages = addRoomMessage(roomId, normalizedMessage, CHAT_HISTORY_LIMIT);

      if (mongoose.connection.readyState === 1) {
        await Room.findOneAndUpdate(
          { roomId },
          { chatMessages: messages },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
      }

      io.to(roomId).emit("SYNC_CHAT_MESSAGE", { message: normalizedMessage });
    });

    socket.on("VOICE_JOIN", ({ roomId, userId }) => {
      if (!roomId) {
        return;
      }

      const currentUsers = new Set(getRoomVoiceUsers(roomId));
      currentUsers.add(socket.id);
      setRoomVoiceUsers(roomId, currentUsers);
      currentVoiceRoom = roomId;

      socket.emit("VOICE_PARTICIPANTS", {
        participants: Array.from(currentUsers).filter((id) => id !== socket.id),
      });

      socket.to(roomId).emit("VOICE_USER_JOINED", {
        socketId: socket.id,
        userId: userId || socket.id,
      });
    });

    socket.on("VOICE_SIGNAL", ({ roomId, targetSocketId, signal }) => {
      if (!roomId || !targetSocketId || !signal) {
        return;
      }

      io.to(targetSocketId).emit("VOICE_SIGNAL", {
        roomId,
        fromSocketId: socket.id,
        signal,
      });
    });

    socket.on("VOICE_LEAVE", ({ roomId }) => {
      if (!roomId) {
        return;
      }

      const currentUsers = new Set(getRoomVoiceUsers(roomId));
      currentUsers.delete(socket.id);
      setRoomVoiceUsers(roomId, currentUsers);
      currentVoiceRoom = null;

      socket.to(roomId).emit("VOICE_USER_LEFT", {
        socketId: socket.id,
      });
    });

    socket.on("VOICE_ACTIVITY", ({ roomId, isSpeaking }) => {
      if (!roomId || typeof isSpeaking !== "boolean") {
        return;
      }

      socket.to(roomId).emit("VOICE_ACTIVITY", {
        socketId: socket.id,
        isSpeaking,
      });
    });

    socket.on("UNDO", async ({ roomId, elements }) => {
      if (!roomId || !Array.isArray(elements)) {
        return;
      }

      setRoomElements(roomId, elements);
      await persistElements(roomId, elements);
      socket.to(roomId).emit("SYNC_DRAW", { elements });
    });

    socket.on("REDO", async ({ roomId, elements }) => {
      if (!roomId || !Array.isArray(elements)) {
        return;
      }

      setRoomElements(roomId, elements);
      await persistElements(roomId, elements);
      socket.to(roomId).emit("SYNC_DRAW", { elements });
    });

    socket.on("disconnect", async () => {
      if (!currentRoom) {
        return;
      }

      try {
        const users = getRoomUsers(currentRoom).filter((id) => id !== socket.id);
        setRoomUsers(currentRoom, users);

        if (mongoose.connection.readyState === 1) {
          await Room.findOneAndUpdate({ roomId: currentRoom }, { users }, { returnDocument: 'after' });
        }

        socket.to(currentRoom).emit("USER_LEFT", { socketId: socket.id });
      } catch (error) {
        console.error("disconnect cleanup failed:", error.message);
      }

      if (currentVoiceRoom) {
        const voiceUsers = new Set(getRoomVoiceUsers(currentVoiceRoom));
        voiceUsers.delete(socket.id);
        setRoomVoiceUsers(currentVoiceRoom, voiceUsers);
        socket.to(currentVoiceRoom).emit("VOICE_USER_LEFT", {
          socketId: socket.id,
        });
      }
    });
  });
}

module.exports = {
  registerSocketHandlers,
};
