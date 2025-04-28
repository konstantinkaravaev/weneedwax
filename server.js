require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { Resend } = require("resend");

const app = express();

const resend = new Resend(process.env.RESEND_API_KEY);

// Папки
const distDir = path.join(__dirname, "dist", "weneedwax");
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// CORS
app.use(
  cors({
    origin: [
      "https://weneedwax.com",
      "http://weneedwax.com",
      "http://localhost:4200",
    ],
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Раздача статики (Angular билд)
app.use(express.static(distDir));

// Multer (загрузка файлов)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// 📥 Обработчик загрузки данных формы
app.post("/upload", upload.single("file"), async (req, res) => {
  console.log("➡️ Получены данные формы:", req.body);

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

  if (fs.existsSync(formsFilePath)) {
    const fileData = fs.readFileSync(formsFilePath, "utf-8");
    try {
      formsArray = JSON.parse(fileData);
    } catch (error) {
      console.error("❌ Ошибка чтения forms.json:", error);
    }
  }

  formsArray.push(newFormData);

  fs.writeFile(
    formsFilePath,
    JSON.stringify(formsArray, null, 2),
    async (err) => {
      if (err) {
        console.error("❌ Ошибка записи формы:", err);
        return res.status(500).json({ message: "Failed to save form data" });
      }
      console.log("✅ Форма добавлена в forms.json");

      // 📬 Отправляем письмо через Resend
      try {
        await resend.emails.send({
          from: "info@weneedwax.com",
          to: ["hey@weneedwax.com"],
          subject: `Новая заявка на We Need Wax`,
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
`,
        });
        console.log("📬 Email успешно отправлен!");
      } catch (emailError) {
        console.error("❌ Ошибка отправки email:", emailError);
      }

      res.status(200).json({ message: "Upload successful" });
    },
  );
});

// 📜 Фолбэк: отдаём Angular если не найден маршрут
app.get("*", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

// Определяем окружение
const isProduction = process.env.NODE_ENV === "production";

// Запуск сервера
if (isProduction) {
  // 🚀 HTTPS сервер для продакшена
  const sslOptions = {
    key: fs.readFileSync("/etc/letsencrypt/live/weneedwax.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/weneedwax.com/fullchain.pem"),
  };

  https.createServer(sslOptions, app).listen(443, () => {
    console.log("✅ HTTPS сервер запущен на порту 443");
  });

  // 🌐 HTTP перенаправление на HTTPS
  http
    .createServer((req, res) => {
      res.writeHead(301, { Location: "https://" + req.headers.host + req.url });
      res.end();
    })
    .listen(80, () => {
      console.log("ℹ️ HTTP -> HTTPS редирект запущен на порту 80");
    });
} else {
  // 🚀 HTTP сервер для локальной разработки
  const PORT = process.env.PORT || 3000;
  http.createServer(app).listen(PORT, () => {
    console.log(`✅ HTTP сервер запущен на порту ${PORT}`);
  });
}
