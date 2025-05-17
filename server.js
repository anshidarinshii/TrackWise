require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql2');
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
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '2411',
  database: process.env.DB_NAME || 'railway',
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: false
  }
});

// Add error handling for database connection
db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to the database');
});

// Session store
const sessionStore = new MySQLStore({
  expiration: 86400000, // 24 hours
  createDatabaseTable: true
}, db);

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
    const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.query(query, [name, email, hashedPassword], (err, results) => {
      if (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
        return;
      }
      res.status(201).json({ message: 'Registration successful' });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM users WHERE email = ?';
  
  db.query(query, [email], async (err, results) => {
    if (err || results.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    req.session.userId = user.id;
    res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Check authentication status
app.get('/api/check-auth', requireAuth, (req, res) => {
  const query = 'SELECT name FROM users WHERE id = ?';
  db.query(query, [req.session.userId], (err, results) => {
    if (err || results.length === 0) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json({ name: results[0].name });
  });
});

// Dashboard data
app.get('/api/dashboard', requireAuth, (req, res) => {
  const userId = req.session.userId;
  
  const query = `
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
    FROM transactions 
    WHERE user_id = ?
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
      return;
    }
    res.json(results[0]);
  });
});

// Transactions
app.get('/api/transactions', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const query = 'SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC';
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
      return;
    }
    res.json(results);
  });
});

app.post('/api/transactions', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { type, amount, description, date } = req.body;
  
  const query = 'INSERT INTO transactions (user_id, type, amount, description, timestamp) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [userId, type, amount, description, date], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to add transaction' });
      return;
    }
    res.json({ success: true, id: results.insertId });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 