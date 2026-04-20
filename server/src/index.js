const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const roomRoutes = require("./routes/roomRoutes");
const canvasRoutes = require("./routes/canvasRoutes");
const { registerSocketHandlers } = require("./socket");

dotenv.config();

const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/room", roomRoutes);
app.use("/api/canvas", canvasRoutes);

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"],
  },
});

registerSocketHandlers(io);

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn("MONGO_URI is not set. Running with in-memory fallback only.");
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected.");
  } catch (error) {
    console.error("MongoDB connection failed. Running with in-memory fallback.", error.message);
  }
}

server.listen(port, async () => {
  await connectDatabase();
  console.log(`Server listening on port ${port}`);
});
