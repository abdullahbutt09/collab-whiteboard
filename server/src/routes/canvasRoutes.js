const express = require("express");
const { saveCanvas, getCanvas } = require("../controllers/canvasController");

const router = express.Router();

router.post("/save", saveCanvas);
router.get("/:roomId", getCanvas);

module.exports = router;
