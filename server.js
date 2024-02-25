const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const app = express();
const port = 3000;
const cors = require("cors");
const fs = require("fs");
const path = require("path");

app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:4200" }));
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.post("/upload", upload.single("file"), (req, res) => {
  console.log("File uploaded:", req.file);
  res.status(200).send("File uploaded successfully");
});

app.post("/submit", (req, res) => {
  const data = req.body;
  const timestamp = new Date().toISOString();
  const logEntry = `Timestamp: ${timestamp}\nData: ${JSON.stringify(
    data,
    null,
    2
  )}\n\n`;

  const logFilePath = path.join(__dirname, "uploads", "form-data-log.txt");
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error("Error writing to log file:", err);
      return res.status(500).json({ error: "Error saving data" });
    }

    console.log("Received data from client:", data);
    res.status(200).json({ message: "Data received successfully" });
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
