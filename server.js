const express = require("express");
const multer = require("multer");
const app = express();
const port = 3000;
const cors = require("cors");

app.use(cors({ origin: "http://localhost:4200" }));

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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
