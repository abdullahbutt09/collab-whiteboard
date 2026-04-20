const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    userId: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    users: {
      type: [String],
      default: [],
    },
    chatMessages: {
      type: [chatMessageSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model("Room", roomSchema);
