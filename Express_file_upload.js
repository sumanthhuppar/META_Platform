import express from "express";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors({
  origin: ["https://mctn869h2g0j3q9ybb621glvf4t4.pub.sfmc-content.com"],
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
}));

const TOKEN = process.env.META_ACCESS_TOKEN;
const APP_ID = process.env.META_APP_ID;

/* ===============================
   STEP-1 → CREATE UPLOAD SESSION
=================================*/
async function createUploadSession(file) {
  const url =
    `https://graph.facebook.com/v24.0/${APP_ID}/uploads` +
    `?file_name=${file.originalname}` +
    `&file_length=${file.size}` +
    `&file_type=${file.mimetype}` +
    `&access_token=${TOKEN}`;

  const res = await fetch(url, { method: "POST" });
  const data = await res.json();

  if (!res.ok) throw new Error(JSON.stringify(data));

  return data.id;
}

/* ===============================
   STEP-2 → UPLOAD BINARY
=================================*/
async function uploadBinary(uploadId, filePath, mimeType) {
  const url = `https://graph.facebook.com/v24.0/${uploadId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${TOKEN}`,
      file_offset: "0",
      "Content-Type": mimeType,
    },
    body: fs.createReadStream(filePath),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));

  return data;
}

/* ===============================
   ROUTE → MULTIPLE IMAGE HANDLER
=================================*/
app.post("/upload", upload.array("images", 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const results = [];

    // 🔁 Process each uploaded image
    for (const file of req.files) {

      /* Step-1 → Create session */
      const uploadId = await createUploadSession(file);

      /* Step-2 → Upload binary */
      const metaRes = await uploadBinary(uploadId, file.path, file.mimetype);

      /* Cleanup temp file */
      fs.unlinkSync(file.path);

      results.push({
        fileName: file.originalname,
        uploadId,
        metaResponse: metaRes,
      });
    }

    return res.json({
      message: "All images uploaded successfully",
      totalFiles: results.length,
      uploads: results,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

/* ===============================
   START SERVER
=================================*/
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
