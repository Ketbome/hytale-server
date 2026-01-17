const express = require("express");
const multer = require("multer");
const config = require("../config");
const files = require("../services/files");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.files.maxUploadSize }
});

router.post("/files/upload", upload.single("file"), async (req, res) => {
  try {
    const { targetDir } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: "No file provided" });
    }

    if (file.size > config.files.maxUploadSize) {
      return res.status(413).json({ success: false, error: "File too large (max 100MB)" });
    }

    const result = await files.upload(
      targetDir || "/",
      file.originalname,
      file.buffer
    );

    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/files/download", async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ success: false, error: "Path required" });
    }

    const result = await files.download(filePath);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}.tar"`);
    res.setHeader("Content-Type", "application/x-tar");

    result.stream.pipe(res);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
