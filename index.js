require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

const db = require('./db');
const mailer = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Auth config
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const SESSION_SECRET = process.env.SESSION_SECRET || 'very-secret-session-key';

// View engine + layouts
const expressLayouts = require('express-ejs-layouts');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body parsing
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions for login
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

// Multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, unique + '-' + safeName);
  }
});
const upload = multer({ storage });

// Helpers
function formatCurrency(amount) {
  const num = Number(amount || 0);
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Make helpers + session + query available in all views
app.use((req, res, next) => {
  res.locals.formatCurrency = formatCurrency;
  res.locals.query = req.query || {};
  res.locals.currentUser = req.session && req.session.user;
  next();
});

// Auth middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.user === ADMIN_USER) {
    return next();
  }
  return res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
  res.redirect('/request');
});

// Login
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Admin Login',
    error: null
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    req.session.user = username;
    return res.redirect('/admin');
  }
  res.status(401).render('login', {
    title: 'Admin Login',
    error: 'Invalid username or password.'
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Show PO Request form
app.get('/request', (req, res) => {
  res.render('request-form', {
    title: 'PO Request',
    submitted: false,
    po: null,
    error: null
  });
});

// Handle PO Request submission with file upload
app.post('/request', upload.single('attachment'), async (req, res) => {
  try {
    const {
      requesterName,
      requesterEmail,
      division,
      vendorName,
      description,
      amount,
      jobNumber,
      category
    } = req.body;

    if (!requesterName || !division || !vendorName || !description || !amount) {
      return res.status(400).render('request-form', {
        title: 'PO Request',
        submitted: false,
        po: null,
        error: 'Please fill in all required fields.'
      });
    }

    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).render('request-form', {
        title: 'PO Request',
        submitted: false,
        po: null,
        error: 'Amount must be a positive number.'
      });
    }

    let attachmentPath = null;
    let attachmentOriginalName = null;
    if (req.file) {
      attachmentPath = '/uploads/' + path.basename(req.file.path);
      attachmentOriginalName = req.file.originalname;
    }

    const po = db.createPoRequest({
      requesterName,
      requesterEmail,
      division,
      vendorName,
      description,
      amount: numericAmount,
      jobNumber,
      category,
      attachmentPath,
      attachmentOriginalName
    });

    // Email notification: new PO
    try {
      await mailer.sendNewPoNotification(po);
    } catch (err) {
      console.error('Failed to send new PO notification:', err.message);
    }

    res.render('request-form', {
      title: 'PO Request',
      submitted: true,
      po,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('request-form', {
      title: 'PO Request',
      submitted: false,
      po: null,
      error: 'Something went wrong. Please try again.'
    });
  }
});

// Admin panel: list requests
app.get('/admin', requireAdmin, (req, res) => {
  const requests = db.listPoRequests();
  res.render('admin', {
    title: 'Admin - PO Requests',
    requests
  });
});

// Approve
app.post('/admin/:id/approve', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const po = db.updateStatus(id, 'APPROVED');

  try {
    await mailer.sendStatusChangeNotification(po);
  } catch (err) {
    console.error('Failed to send status change notification:', err.message);
  }

  res.redirect('/admin');
});

// Reject
app.post('/admin/:id/reject', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const po = db.updateStatus(id, 'REJECTED');

  try {
    await mailer.sendStatusChangeNotification(po);
  } catch (err) {
    console.error('Failed to send status change notification:', err.message);
  }

  res.redirect('/admin');
});

app.listen(PORT, () => {
  console.log(`PO Request System running on http://localhost:${PORT}`);
});
