require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Session store
const sessionStore = new pgSession({
  pool,
  tableName: 'session'
});

// Session middleware
app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'hello',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000 // 24 hours
  }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id';
    const result = await pool.query(query, [name, email, hashedPassword]);
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Check authentication status
app.get('/api/check-auth', requireAuth, async (req, res) => {
  try {
    const query = 'SELECT name FROM users WHERE id = $1';
    const result = await pool.query(query, [req.session.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ name: result.rows[0].name });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Dashboard data
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
      FROM transactions 
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Transactions
app.get('/api/transactions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const query = 'SELECT * FROM transactions WHERE user_id = $1 ORDER BY timestamp DESC';
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { type, amount, description, date } = req.body;
    
    const query = 'INSERT INTO transactions (user_id, type, amount, description, timestamp) VALUES ($1, $2, $3, $4, $5) RETURNING id';
    const result = await pool.query(query, [userId, type, amount, description, date]);
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 