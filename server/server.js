require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { Resend } = require("resend");

const app = express();

const resend = new Resend(process.env.RESEND_API_KEY || "");
const resendFrom = process.env.RESEND_FROM || "info@weneedwax.com";
const resendTo = (process.env.RESEND_TO || "hey@weneedwax.com")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);
const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY || "";
const recaptchaMinScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
const maxFileSizeMb = Number(process.env.MAX_UPLOAD_MB || 5);

// Paths
const distDir = path.join(__dirname, "..", "dist", "weneedwax");
const uploadDir = path.join(__dirname, "..", "uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.set("trust proxy", 1);

// CORS settings
app.use(
  cors({
    origin: [
      "https://weneedwax.com",
      "http://weneedwax.com",
      "https://www.weneedwax.com",
      "http://www.weneedwax.com",
      "http://localhost:4200",
    ],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (Angular build)
app.use(express.static(distDir));

// Multer storage settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("INVALID_FILE_TYPE"));
    }

    return cb(null, true);
  }
});

async function verifyRecaptcha(token, remoteIp) {
  if (!recaptchaSecretKey) {
    return { ok: true, skipped: true };
  }

  const params = new URLSearchParams({
    secret: recaptchaSecretKey,
    response: token
  });

  if (remoteIp) {
    params.append("remoteip", remoteIp);
  }

  const result = await new Promise((resolve, reject) => {
    const request = https.request(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(params.toString())
        }
      },
      (response) => {
        let raw = "";
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("error", reject);
    request.write(params.toString());
    request.end();
  });
  const score = typeof result.score === "number" ? result.score : 0;

  if (!result.success || score < recaptchaMinScore) {
    return {
      ok: false,
      score,
      reason: result["error-codes"] || []
    };
  }

  return { ok: true, score };
}

// Handle form data uploads
app.post("/upload", upload.single("file"), async (req, res) => {
  console.log("Received form data:", req.body);

  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  const recaptchaToken = req.body.recaptchaToken;
  if (!recaptchaToken) {
    return res.status(400).json({ message: "Missing reCAPTCHA token" });
  }

  try {
    const verification = await verifyRecaptcha(recaptchaToken, req.ip);
    if (!verification.ok) {
      return res.status(403).json({ message: "reCAPTCHA failed" });
    }
  } catch (error) {
    console.error("reCAPTCHA verify error:", error);
    return res.status(502).json({ message: "reCAPTCHA verification failed" });
  }

  const newFormData = {
    title: req.body.title,
    artist: req.body.artist,
    genre: req.body.genre,
    year: req.body.year,
    condition: req.body.condition,
    price: req.body.price,
    uploadedAt: new Date().toISOString(),
    file: req.file ? req.file.filename : null,
  };

  const formsFilePath = path.join(uploadDir, "forms.json");
  let formsArray = [];

  try {
    if (fs.existsSync(formsFilePath)) {
      const fileData = await fs.promises.readFile(formsFilePath, "utf-8");
      formsArray = JSON.parse(fileData);
    }
  } catch (error) {
    console.error("Error reading forms.json:", error);
  }

  formsArray.push(newFormData);

  try {
    const tempPath = `${formsFilePath}.tmp`;
    await fs.promises.writeFile(
      tempPath,
      JSON.stringify(formsArray, null, 2)
    );
    await fs.promises.rename(tempPath, formsFilePath);
    console.log("Form data saved to forms.json");
  } catch (error) {
    console.error("Error writing to forms.json:", error);
    return res.status(500).json({ message: "Failed to save form data" });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
    return res.status(500).json({ message: "Email service not configured" });
  }

  if (resendTo.length === 0) {
    console.error("Missing RESEND_TO");
    return res.status(500).json({ message: "Email recipients not configured" });
  }

  try {
    await resend.emails.send({
      from: resendFrom,
      to: resendTo,
      subject: "New submission on We Need Wax",
      html: `
        <h2>New Submission</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Title</td><td style="border: 1px solid #ddd; padding: 8px;">${req.body.title}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Artist</td><td style="border: 1px solid #ddd; padding: 8px;">${req.body.artist}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Year</td><td style="border: 1px solid #ddd; padding: 8px;">${req.body.year}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Genre</td><td style="border: 1px solid #ddd; padding: 8px;">${req.body.genre}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Condition</td><td style="border: 1px solid #ddd; padding: 8px;">${req.body.condition}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Price</td><td style="border: 1px solid #ddd; padding: 8px;">${req.body.price}</td></tr>
        </table>
      `
    });
    console.log("Email notification sent successfully");
  } catch (emailError) {
    console.error("Error sending email:", emailError);
    return res.status(502).json({ message: "Email sending failed" });
  }

  return res.status(200).json({ message: "Upload successful" });
});

app.use((err, req, res, next) => {
  if (err && err.message === "INVALID_FILE_TYPE") {
    return res.status(400).json({ message: "Only image files are allowed" });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  console.error("Unexpected server error:", err);
  return res.status(500).json({ message: "Server error" });
});

// Fallback route to serve Angular application
app.get("*", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

// Start HTTPS server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});
