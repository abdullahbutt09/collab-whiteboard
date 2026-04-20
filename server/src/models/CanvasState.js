const mongoose = require("mongoose");

const canvasElementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["rectangle", "line", "pencil"],
      required: true,
    },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    points: {
      type: [{ x: Number, y: Number }],
      default: [],
    },
    color: { type: String, default: "#111111" },
    strokeWidth: { type: Number, default: 2 },
    userId: { type: String, default: "anonymous" },
  },
  { _id: false }
);

const canvasStateSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    elements: {
      type: [canvasElementSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

module.exports = mongoose.model("CanvasState", canvasStateSchema);
