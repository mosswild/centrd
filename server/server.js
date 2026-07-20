const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Set up directories (configurable via environment variables for Docker mounts)
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Serve uploaded static files on both paths for development and production
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/centrd/uploads', express.static(UPLOADS_DIR));

// Configure Multer for image file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueId = Math.random().toString(36).substr(2, 9);
    cb(null, `throw_photo_${uniqueId}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Helper to read JSON database
function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = { profiles: [], settings: {}, throws: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error("Failed to read database, returning empty template:", e);
    return { profiles: [], settings: {}, throws: [] };
  }
}

// Helper to write JSON database
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to write to database:", e);
  }
}

// Registry for Server-Sent Events (SSE) connections
let sseClients = [];

// Broadcast updated throws to connected clients of a specific user
function broadcastThrowsUpdate(userId) {
  const db = readDb();
  const userThrows = db.throws
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const payload = JSON.stringify(userThrows);
  
  sseClients.forEach(client => {
    if (client.userId === userId) {
      client.res.write(`data: ${payload}\n\n`);
    }
  });
}

// --- PROFILE APIS ---
app.get('/api/profiles', (req, res) => {
  const db = readDb();
  res.json(db.profiles || []);
});

app.post('/api/profiles', (req, res) => {
  const { name, studio, avatar } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const db = readDb();
  const id = 'profile_' + Math.random().toString(36).substr(2, 9);
  const newProfile = { id, name, studio: studio || '', avatar: avatar || '🍯' };
  
  db.profiles = db.profiles || [];
  db.profiles.push(newProfile);
  writeDb(db);

  res.json(newProfile);
});

app.delete('/api/profiles/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();

  // Remove profile
  db.profiles = (db.profiles || []).filter(p => p.id !== id);

  // Remove settings
  if (db.settings && db.settings[id]) {
    delete db.settings[id];
  }

  // Find throws to delete their images from disk
  const userThrows = db.throws.filter(t => t.userId === id);
  userThrows.forEach(t => {
    if (t.photos) {
      t.photos.forEach(photo => {
        if (photo.url) {
          const filename = path.basename(photo.url);
          const filepath = path.join(UPLOADS_DIR, filename);
          if (fs.existsSync(filepath)) {
            try { fs.unlinkSync(filepath); } catch (e) {}
          }
        }
      });
    }
  });

  // Remove throws
  db.throws = db.throws.filter(t => t.userId !== id);

  writeDb(db);

  // Close any active SSE streams for this user
  sseClients = sseClients.filter(c => {
    if (c.userId === id) {
      try { c.res.end(); } catch (e) {}
      return false;
    }
    return true;
  });

  res.json({ success: true });
});

// --- SETTINGS APIS ---
app.get('/api/settings/:userId', (req, res) => {
  const { userId } = req.params;
  const db = readDb();
  const userSettings = db.settings ? db.settings[userId] : null;

  if (userSettings) {
    return res.json(userSettings);
  }

  // Fallback default settings template
  res.json({
    userId,
    targetCylinders: 200,
    hasTimeLimit: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    scheduleType: 'none',
    cadenceFrequency: 3,
    cadencePeriod: 'week',
    globalUnit: 'lb',
    weightCategories: [
      { id: '1lb', name: '1 lb Cylinder', weight: 1, unit: 'lb', targetCount: 100 },
      { id: '2lb', name: '2 lb Cylinder', weight: 2, unit: 'lb', targetCount: 50 },
      { id: '3lb', name: '3 lb Cylinder', weight: 3, unit: 'lb', targetCount: 30 },
      { id: '5lb', name: '5 lb Cylinder', weight: 5, unit: 'lb', targetCount: 20 }
    ]
  });
});

app.post('/api/settings', (req, res) => {
  const settings = req.body;
  const { userId } = settings;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const db = readDb();
  db.settings = db.settings || {};
  db.settings[userId] = settings;
  writeDb(db);

  res.json(settings);
});

// --- THROWS APIS ---
app.get('/api/throws/:userId', (req, res) => {
  const { userId } = req.params;
  const db = readDb();
  const list = db.throws
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// Real-Time SSE Stream
app.get('/api/throws/stream/:userId', (req, res) => {
  const { userId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now();
  const newClient = { id: clientId, userId, res };
  sseClients.push(newClient);

  // Send initial data immediately
  const db = readDb();
  const userThrows = db.throws
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.write(`data: ${JSON.stringify(userThrows)}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

app.post('/api/throws', (req, res) => {
  const throwData = req.body;
  const { userId } = throwData;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const db = readDb();
  const id = 'throw_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  
  const newThrow = {
    id,
    createdAt: new Date().toISOString(),
    photos: [],
    ...throwData
  };

  db.throws = db.throws || [];
  db.throws.push(newThrow);
  writeDb(db);

  broadcastThrowsUpdate(userId);
  res.json(newThrow);
});

app.put('/api/throws/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const db = readDb();
  db.throws = db.throws || [];
  
  const idx = db.throws.findIndex(t => t.id === id);
  if (idx !== -1) {
    db.throws[idx] = { ...db.throws[idx], ...updates };
    writeDb(db);
    broadcastThrowsUpdate(db.throws[idx].userId);
    return res.json(db.throws[idx]);
  }

  res.status(404).json({ error: 'Throw not found' });
});

app.delete('/api/throws/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  db.throws = db.throws || [];

  const target = db.throws.find(t => t.id === id);
  if (!target) return res.status(404).json({ error: 'Throw not found' });

  // Delete associated images from disk
  if (target.photos) {
    target.photos.forEach(photo => {
      if (photo.url) {
        const filename = path.basename(photo.url);
        const filepath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filepath)) {
          try { fs.unlinkSync(filepath); } catch (e) {}
        }
      }
    });
  }

  db.throws = db.throws.filter(t => t.id !== id);
  writeDb(db);

  broadcastThrowsUpdate(target.userId);
  res.json({ success: true });
});

// --- IMAGE UPLOAD API ---
app.post('/api/photos/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { stageLabel } = req.body;

  // Build client URL that maps to server static asset path under base /centrd/
  const fileUrl = `/centrd/uploads/${req.file.filename}`;

  res.json({
    id: 'photo_' + Math.random().toString(36).substr(2, 9),
    url: fileUrl,
    stage: stageLabel || 'Thrown',
    timestamp: new Date().toISOString()
  });
});

// Serve compiled React frontend built assets in production
const DIST_DIR = path.join(__dirname, '../dist');
app.use('/centrd', express.static(DIST_DIR));

// Base route redirect
app.get('/', (req, res) => {
  res.redirect('/centrd/');
});

// SPA routing fallback
app.get('/centrd/*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`Centrd Home Server is running on port ${PORT}`);
});
