require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const nodemailer = require("nodemailer");
const sharp = require("sharp");
const { createClient } = require("@supabase/supabase-js");
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

const app = express();

const sesHost = process.env.SES_SMTP_HOST || "";
const sesUser = process.env.SES_SMTP_USER || "";
const sesPass = process.env.SES_SMTP_PASS || "";
const sesPort = Number(process.env.SES_SMTP_PORT || 587);
const mailFrom = process.env.SES_FROM || "info@weneedwax.com";
const mailTo = (process.env.SES_TO || "hey@weneedwax.com")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);
const mailTransport = sesHost && sesUser && sesPass
  ? nodemailer.createTransport({
      host: sesHost,
      port: sesPort,
      secure: sesPort === 465,
      auth: {
        user: sesUser,
        pass: sesPass,
      },
    })
  : null;
const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY || "";
const recaptchaMinScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
const maxFileSizeMb = Number(process.env.MAX_UPLOAD_MB || 10);
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 20);
const allowedOriginsEnv = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const defaultAllowedOrigins = [
  "https://weneedwax.com",
  "https://www.weneedwax.com",
  "https://konstantinkaravaev.github.io",
  "http://localhost:4200"
];
const allowedOrigins =
  allowedOriginsEnv.length > 0 ? allowedOriginsEnv : defaultAllowedOrigins;
const isProduction = process.env.NODE_ENV === "production";
const isLocalDev = process.env.LOCAL_DEV_MODE === "true";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseBucket = process.env.SUPABASE_BUCKET || "submissions";
const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false }
      })
    : null;

// Paths
const distDir = path.join(__dirname, "..", "dist", "weneedwax");
const uploadDir = path.join(__dirname, "..", "uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://www.google.com",
          "https://www.gstatic.com"
        ],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        styleSrcAttr: ["'unsafe-inline'"],
        styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
        frameSrc: ["https://www.google.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        workerSrc: ["'self'", "blob:"],
        upgradeInsecureRequests: []
      }
    }
  })
);

// CORS settings
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS_NOT_ALLOWED"));
    }
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Serve static files (Angular build)
app.use(express.static(distDir));

// Multer storage settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(safeName).toLowerCase();
    const unique = crypto.randomUUID();
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"));
    }
    return cb(null, true);
  }
});

const uploadLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});

const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const e164Regex = /^\+[1-9]\d{1,14}$/;
const priceRegex = /^\d+(\.\d{1,2})?$/;
const minYear = 1900;
const maxPrice = 100000;
const genreOptions = [
  "Ambient",
  "Blues",
  "Classical",
  "Disco",
  "Electronic",
  "Funk",
  "House",
  "Hip-Hop",
  "Jazz",
  "Pop",
  "R&B",
  "Reggae",
  "Rock",
  "Soul",
  "Techno"
];
const conditionOptions = [
  "Mint (M)",
  "Near Mint (NM)",
  "Very Good Plus (VG+)",
  "Very Good (VG)",
  "Good Plus (G+)",
  "Good (G)",
  "Fair (F)",
  "Poor (P)"
];

const uploadSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().regex(emailRegex),
  phone: z.string().trim().regex(e164Regex),
  title: z.string().trim().min(2).max(120),
  artist: z.string().trim().min(2).max(120),
  genre: z
    .string()
    .trim()
    .refine((value) => genreOptions.includes(value), "Invalid genre"),
  year: z
    .string()
    .trim()
    .regex(/^\d{4}$/)
    .refine((value) => {
      const year = Number(value);
      const maxYear = new Date().getFullYear();
      return year >= minYear && year <= maxYear;
    }, "Invalid year"),
  condition: z
    .string()
    .trim()
    .refine((value) => conditionOptions.includes(value), "Invalid condition"),
  price: z
    .string()
    .trim()
    .regex(priceRegex)
    .refine((value) => {
      const price = Number(value);
      return Number.isFinite(price) && price > 0 && price <= maxPrice;
    }, "Invalid price"),
  recaptchaToken: z.string().min(10)
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function safeUnlink(filePath) {
  if (!filePath) {
    return;
  }
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      console.error("Failed to delete file:", error);
    }
  }
}

async function compressUploadedImage(file, detectedMime) {
  const inputPath = file.path;
  const parsedPath = path.parse(inputPath);
  const originalExt = path.extname(file.originalname);
  const baseOriginalName = path.basename(file.originalname, originalExt);
  let outputExt = parsedPath.ext || "";
  let outputMime = detectedMime;
  let pipeline = sharp(inputPath);

  switch (detectedMime) {
    case "image/png":
      outputExt = ".png";
      outputMime = "image/png";
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
      break;
    case "image/jpeg":
      outputExt = ".jpg";
      outputMime = "image/jpeg";
      pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
      break;
    case "image/webp":
    case "image/heic":
    case "image/heif":
      outputExt = ".jpg";
      outputMime = "image/jpeg";
      pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
      break;
    default:
      return { file, outputMime: detectedMime };
  }

  const outputFileName = `${parsedPath.name}-compressed${outputExt}`;
  const outputPath = path.join(parsedPath.dir, outputFileName);

  await pipeline.toFile(outputPath);
  await safeUnlink(inputPath);

  return {
    file: {
      ...file,
      path: outputPath,
      filename: outputFileName,
      mimetype: outputMime,
      originalname: `${baseOriginalName}${outputExt}`
    },
    outputMime
  };
}

async function uploadToSupabase(file, submissionId) {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
  const fileKey = `${submissionId}/${file.filename}`;
  const fileBuffer = await fs.promises.readFile(file.path);
  const { error } = await supabase.storage
    .from(supabaseBucket)
    .upload(fileKey, fileBuffer, {
      contentType: file.mimetype,
      upsert: false
    });
  if (error) {
    throw error;
  }
  return { fileKey, fileBucket: supabaseBucket };
}

async function deleteFromSupabase(fileKey) {
  if (!supabase || !fileKey) {
    return;
  }
  const { error } = await supabase.storage.from(supabaseBucket).remove([fileKey]);
  if (error) {
    console.error("Failed to remove storage object:", error);
  }
}

let formsWriteQueue = Promise.resolve();
async function appendFormSubmission(entry, formsFilePath) {
  formsWriteQueue = formsWriteQueue.then(async () => {
    let formsArray = [];
    try {
      if (fs.existsSync(formsFilePath)) {
        const fileData = await fs.promises.readFile(formsFilePath, "utf-8");
        formsArray = JSON.parse(fileData);
        if (!Array.isArray(formsArray)) {
          formsArray = [];
        }
      }
    } catch (error) {
      console.error("Error reading forms.json:", error);
      formsArray = [];
    }

    formsArray.push(entry);

    const tempPath = `${formsFilePath}.tmp`;
    await fs.promises.writeFile(
      tempPath,
      JSON.stringify(formsArray, null, 2)
    );
    await fs.promises.rename(tempPath, formsFilePath);
  });
  const writePromise = formsWriteQueue;
  formsWriteQueue = formsWriteQueue.catch(() => {});
  return writePromise;
}

// Handle form data uploads
app.post("/upload", uploadLimiter, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  let detectedType;
  try {
    const { fileTypeFromFile } = await import("file-type");
    detectedType = await fileTypeFromFile(req.file.path);
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif"
    ]);
  if (!detectedType || !allowedTypes.has(detectedType.mime)) {
      await safeUnlink(req.file.path);
      return res.status(400).json({ message: "Only image files are allowed" });
    }
  } catch (error) {
    console.error("File inspection error:", error);
    await safeUnlink(req.file.path);
    return res.status(400).json({ message: "Invalid file upload" });
  }
  if (isProduction && !recaptchaSecretKey) {
    await safeUnlink(req.file.path);
    return res.status(500).json({ message: "reCAPTCHA is not configured" });
  }

  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    console.warn("Invalid form data:", parsed.error.flatten());
    await safeUnlink(req.file.path);
    return res.status(400).json({
      message: "Invalid form data",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  const { recaptchaToken } = parsed.data;

  if (!isLocalDev) {
    try {
      const verification = await verifyRecaptcha(recaptchaToken, req.ip);
      if (!verification.ok) {
        await safeUnlink(req.file.path);
        return res.status(403).json({ message: "reCAPTCHA failed" });
      }
    } catch (error) {
      console.error("reCAPTCHA verify error:", error);
      await safeUnlink(req.file.path);
      return res.status(502).json({ message: "reCAPTCHA verification failed" });
    }
  }

  try {
    const compressed = await compressUploadedImage(req.file, detectedType?.mime);
    req.file = compressed.file;
  } catch (error) {
    console.error("Image compression error:", error);
    await safeUnlink(req.file.path);
    return res.status(500).json({ message: "Image compression failed" });
  }

  if (!supabase && !isLocalDev) {
    await safeUnlink(req.file.path);
    return res.status(500).json({ message: "Storage is not configured" });
  }

  const submissionId = crypto.randomUUID();
  let storageInfo = { fileKey: null, fileBucket: null };

  if (!isLocalDev) {
    try {
      storageInfo = await uploadToSupabase(req.file, submissionId);
    } catch (error) {
      console.error("Storage upload failed:", error);
      await safeUnlink(req.file.path);
      return res.status(500).json({ message: "File storage failed" });
    }
  }

  try {
    await prisma.submission.create({
      data: {
        id: submissionId,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        title: parsed.data.title,
        artist: parsed.data.artist,
        genre: parsed.data.genre,
        year: Number(parsed.data.year),
        condition: parsed.data.condition,
        price: new Prisma.Decimal(parsed.data.price),
        fileName: req.file ? req.file.filename : null,
        fileOriginalName: req.file ? req.file.originalname : null,
        fileBucket: storageInfo.fileBucket,
        fileKey: storageInfo.fileKey
      }
    });
  } catch (error) {
    console.error("Database write failed:", error);
    if (storageInfo.fileKey) {
      await deleteFromSupabase(storageInfo.fileKey);
    }
    await safeUnlink(req.file.path);
    return res.status(500).json({ message: "Failed to save form data" });
  }

  if (!mailTransport && !isLocalDev) {
    console.error("Missing SES SMTP configuration");
    await safeUnlink(req.file.path);
    return res.status(500).json({ message: "Email service not configured" });
  }

  if (mailTo.length === 0 && !isLocalDev) {
    console.error("Missing SES_TO");
    await safeUnlink(req.file.path);
    return res.status(500).json({ message: "Email recipients not configured" });
  }

  try {
    if (isLocalDev) {
      await safeUnlink(req.file.path);
      return res.status(200).json({ message: "Upload successful (local mode)" });
    }
    const emailData = {
      fullName: escapeHtml(parsed.data.fullName),
      email: escapeHtml(parsed.data.email),
      phone: escapeHtml(parsed.data.phone),
      title: escapeHtml(parsed.data.title),
      artist: escapeHtml(parsed.data.artist),
      year: escapeHtml(parsed.data.year),
      genre: escapeHtml(parsed.data.genre),
      condition: escapeHtml(parsed.data.condition),
      price: escapeHtml(parsed.data.price)
    };
    const attachment = req.file
      ? [{
          filename: req.file.originalname,
          path: req.file.path,
          contentType: req.file.mimetype
        }]
      : [];

    await mailTransport.sendMail({
      from: mailFrom,
      to: mailTo,
      subject: "New submission on We Need Wax",
      attachments: attachment,
      html: `
        <h2>New Submission</h2>
        <h3>What they are offering</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Artist</td><td style="border: 1px solid #ddd; padding: 8px;">${emailData.artist}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Title</td><td style="border: 1px solid #ddd; padding: 8px;">${emailData.title}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Year</td><td style="border: 1px solid #ddd; padding: 8px;">${emailData.year}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Genre</td><td style="border: 1px solid #ddd; padding: 8px;">${emailData.genre}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Condition</td><td style="border: 1px solid #ddd; padding: 8px;">${emailData.condition}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Price</td><td style="border: 1px solid #ddd; padding: 8px;">${emailData.price}</td></tr>
        </table>
        <h3>How to reach them</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Full name</td><td style="border: 1px solid #ddd; padding: 8px;">${emailData.fullName}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Email</td><td style="border: 1px solid #ddd; padding: 8px;">${emailData.email}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;">Phone</td><td style="border: 1px solid #ddd; padding: 8px;">${emailData.phone}</td></tr>
        </table>
      `
    });
    console.log("Email notification sent successfully");
    await safeUnlink(req.file.path);
  } catch (emailError) {
    console.error("Error sending email:", emailError);
    await safeUnlink(req.file.path);
    return res.status(502).json({ message: "Email sending failed" });
  }

  return res.status(200).json({ message: "Upload successful" });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err && err.message === "CORS_NOT_ALLOWED") {
    return res.status(403).json({ message: "CORS blocked" });
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
