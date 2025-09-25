const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'db.sqlite');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error('DB open error', err);
  else console.log('Connected to SQLite DB:', DB_FILE);
});

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'donor'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS donors (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    blood_type TEXT,
    last_donated TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    blood_type TEXT,
    units INTEGER,
    updated_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    requester_name TEXT,
    hospital TEXT,
    blood_type TEXT,
    units INTEGER,
    status TEXT,
    created_at TEXT
  )`);
});

const now = () => new Date().toISOString();

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  db.run('INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)',
    [id,name,email,hashed,role || 'donor'], function(err){
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id, name, email, role: role || 'donor' });
    });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ id: row.id, email: row.email, role: row.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  });
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no auth' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'malformed auth' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Donors
app.post('/api/donors', (req, res) => {
  const { name, email, phone, blood_type } = req.body;
  if (!name || !email || !blood_type) return res.status(400).json({ error: 'name, email, blood_type required' });
  const id = uuidv4();
  db.run('INSERT INTO donors (id,name,email,phone,blood_type,last_donated) VALUES (?,?,?,?,?,?)',
    [id,name,email,phone||'',blood_type,null], function(err){
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id, name, email, phone, blood_type });
    });
});

app.get('/api/donors', (req, res) => {
  db.all('SELECT * FROM donors', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Inventory
app.get('/api/inventory', (req, res) => {
  db.all('SELECT blood_type, SUM(units) as units FROM inventory GROUP BY blood_type', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/inventory', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    return res.status(403).json({ error: 'insufficient role' });
  }
  const { blood_type, units } = req.body;
  if (!blood_type || units === undefined) return res.status(400).json({ error: 'blood_type and units required' });
  const id = uuidv4();
  db.run('INSERT INTO inventory (id,blood_type,units,updated_at) VALUES (?,?,?,?)',
    [id,blood_type,units,now()], function(err){
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id, blood_type, units });
    });
});

// Requests
app.post('/api/requests', authMiddleware, (req, res) => {
  const { requester_name, hospital, blood_type, units } = req.body;
  if (!requester_name || !hospital || !blood_type || units === undefined) return res.status(400).json({ error: 'missing fields' });
  db.get('SELECT SUM(units) as total FROM inventory WHERE blood_type = ?', [blood_type], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const available = row && row.total ? row.total : 0;
    const status = available >= units ? 'approved' : 'pending';
    const id = uuidv4();
    db.run('INSERT INTO requests (id,requester_name,hospital,blood_type,units,status,created_at) VALUES (?,?,?,?,?,?,?)',
      [id,requester_name,hospital,blood_type,units,status,now()], function(err){
        if (err) return res.status(500).json({ error: err.message });
        if (status === 'approved') {
          const deductId = uuidv4();
          db.run('INSERT INTO inventory (id,blood_type,units,updated_at) VALUES (?,?,?,?)',
            [deductId,blood_type,-Math.abs(units),now()]);
        }
        res.json({ id, status });
      });
  });
});

app.get('/api/requests', authMiddleware, (req, res) => {
  db.all('SELECT * FROM requests ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', now: now() }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
