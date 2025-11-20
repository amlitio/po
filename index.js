require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'changeme-admin-key';

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(bodyParser.urlencoded({ extended: true }));

// Helpers
function formatCurrency(amount) {
  const num = Number(amount || 0);
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Make helpers + query available in all views
app.use((req, res, next) => {
  res.locals.formatCurrency = formatCurrency;
  res.locals.query = req.query || {};
  next();
});

// Routes
app.get('/', (req, res) => {
  res.redirect('/request');
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

// Handle PO Request submission
app.post('/request', (req, res) => {
  try {
    const {
      requesterName,
      requesterEmail,
      division,
      vendorName,
      description,
      amount
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

    const po = db.createPoRequest({
      requesterName,
      requesterEmail,
      division,
      vendorName,
      description,
      amount: numericAmount
    });

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

// Simple admin auth via query ?key=
function requireAdmin(req, res, next) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).send('Forbidden: invalid admin key.');
  }
  next();
}

// Admin panel: list requests
app.get('/admin', requireAdmin, (req, res) => {
  const requests = db.listPoRequests();
  res.render('admin', {
    title: 'Admin - PO Requests',
    requests
  });
});

// Approve
app.post('/admin/:id/approve', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.updateStatus(id, 'APPROVED');
  res.redirect(`/admin?key=${encodeURIComponent(req.query.key)}`);
});

// Reject
app.post('/admin/:id/reject', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.updateStatus(id, 'REJECTED');
  res.redirect(`/admin?key=${encodeURIComponent(req.query.key)}`);
});

app.listen(PORT, () => {
  console.log(`PO Request System running on http://localhost:${PORT}`);
});
