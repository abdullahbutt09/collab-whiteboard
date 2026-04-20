const CanvasState = require("../models/CanvasState");
const mongoose = require("mongoose");
const { getRoomElements, setRoomElements } = require("../utils/memoryStore");

async function saveCanvas(req, res) {
  try {
    const { roomId, elements } = req.body;

    if (!roomId || !Array.isArray(elements)) {
      return res.status(400).json({ message: "roomId and elements are required" });
    }

    if (mongoose.connection.readyState === 1) {
      await CanvasState.findOneAndUpdate(
        { roomId },
        { roomId, elements },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    }

    setRoomElements(roomId, elements);

    return res.status(200).json({ message: "Canvas saved" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to save canvas", error: error.message });
  }
}

async function getCanvas(req, res) {
  try {
    const { roomId } = req.params;
    let canvas = null;

    if (mongoose.connection.readyState === 1) {
      canvas = await CanvasState.findOne({ roomId }).lean();
    }

    if (!canvas) {
      return res.status(200).json({ roomId, elements: getRoomElements(roomId) });
    }

    setRoomElements(roomId, canvas.elements || []);
    return res.status(200).json({ roomId, elements: canvas.elements || [] });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch canvas", error: error.message });
  }
}

module.exports = {
  saveCanvas,
  getCanvas,
};
