require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { Resend } = require('resend');

const app = express();

const resend = new Resend(process.env.RESEND_API_KEY);

// SSL certificates
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/weneedwax.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/weneedwax.com/fullchain.pem'),
};

// Paths
const distDir = path.join(__dirname, 'dist', 'weneedwax');
const uploadDir = path.join(__dirname, 'uploads');

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// CORS settings
app.use(cors({
  origin: [
    'https://weneedwax.com',
    'http://weneedwax.com',
    'http://localhost:4200'
  ]
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (Angular build)
app.use(express.static(distDir));

// Multer storage settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Handle form data uploads
app.post('/upload', upload.single('file'), async (req, res) => {
  console.log('Received form data:', req.body);

  const newFormData = {
    title: req.body.title,
    artist: req.body.artist,
    genre: req.body.genre,
    year: req.body.year,
    condition: req.body.condition,
    price: req.body.price,
    uploadedAt: new Date().toISOString(),
    file: req.file ? req.file.filename : null
  };

  const formsFilePath = path.join(uploadDir, 'forms.json');
  let formsArray = [];

  if (fs.existsSync(formsFilePath)) {
    const fileData = fs.readFileSync(formsFilePath, 'utf-8');
    try {
      formsArray = JSON.parse(fileData);
    } catch (error) {
      console.error('Error reading forms.json:', error);
    }
  }

  formsArray.push(newFormData);

  fs.writeFile(formsFilePath, JSON.stringify(formsArray, null, 2), async (err) => {
    if (err) {
      console.error('Error writing to forms.json:', err);
      return res.status(500).json({ message: 'Failed to save form data' });
    }
    console.log('Form data saved to forms.json');

    // Send email notification
    try {
      await resend.emails.send({
        from: 'info@weneedwax.com',
        to: ['hey@weneedwax.com'],
        subject: 'New submission on We Need Wax',
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
      console.log('Email notification sent successfully');
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }

    res.status(200).json({ message: 'Upload successful' });
  });
});

// Fallback route to serve Angular application
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

// Start HTTPS server
const PORT = process.env.PORT || 3000;

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT}`);
});


