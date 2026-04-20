const roomUsers = new Map();
const roomElements = new Map();
const roomMessages = new Map();
const roomMeta = new Map();

function getRoomUsers(roomId) {
  return roomUsers.get(roomId) || [];
}

function setRoomUsers(roomId, users) {
  roomUsers.set(roomId, users);

  if (!roomMeta.has(roomId)) {
    roomMeta.set(roomId, { roomId, createdAt: new Date() });
  }
}

function getRoomElements(roomId) {
  return roomElements.get(roomId) || [];
}

function setRoomElements(roomId, elements) {
  roomElements.set(roomId, elements);

  if (!roomMeta.has(roomId)) {
    roomMeta.set(roomId, { roomId, createdAt: new Date() });
  }
}

function ensureRoomMeta(roomId) {
  if (!roomMeta.has(roomId)) {
    roomMeta.set(roomId, { roomId, createdAt: new Date() });
  }

  return roomMeta.get(roomId);
}

function getRoomMessages(roomId) {
  return roomMessages.get(roomId) || [];
}

function setRoomMessages(roomId, messages) {
  roomMessages.set(roomId, messages);

  if (!roomMeta.has(roomId)) {
    roomMeta.set(roomId, { roomId, createdAt: new Date() });
  }
}

function addRoomMessage(roomId, message, limit = 100) {
  const next = [...getRoomMessages(roomId), message].slice(-limit);
  setRoomMessages(roomId, next);
  return next;
}

function getRoomMeta(roomId) {
  return roomMeta.get(roomId) || null;
}

module.exports = {
  getRoomUsers,
  setRoomUsers,
  getRoomElements,
  setRoomElements,
  getRoomMessages,
  setRoomMessages,
  addRoomMessage,
  ensureRoomMeta,
  getRoomMeta,
};
