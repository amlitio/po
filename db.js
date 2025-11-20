const Database = require('better-sqlite3');
const path = require('path');

// DB file in project root
const dbPath = path.join(__dirname, 'po.db');
const db = new Database(dbPath);

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS po_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poNumber TEXT NOT NULL,
    requesterName TEXT NOT NULL,
    requesterEmail TEXT,
    division TEXT NOT NULL,
    vendorName TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

function generatePoNumber() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const datePart = `${yyyy}${mm}${dd}`;

  const row = db.prepare(
    "SELECT COUNT(*) as count FROM po_requests WHERE poNumber LIKE ?"
  ).get(`ADL-${datePart}-%`);

  const seq = (row.count || 0) + 1;
  const seqPart = String(seq).padStart(3, '0');
  return `ADL-${datePart}-${seqPart}`;
}

function createPoRequest(data) {
  const now = new Date().toISOString();
  const poNumber = generatePoNumber();

  const stmt = db.prepare(`
    INSERT INTO po_requests (
      poNumber,
      requesterName,
      requesterEmail,
      division,
      vendorName,
      description,
      amount,
      status,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `);

  const info = stmt.run(
    poNumber,
    data.requesterName,
    data.requesterEmail || null,
    data.division,
    data.vendorName,
    data.description,
    data.amount,
    now,
    now
  );

  return getPoById(info.lastInsertRowid);
}

function listPoRequests() {
  return db.prepare(`
    SELECT *
    FROM po_requests
    ORDER BY createdAt DESC
  `).all();
}

function getPoById(id) {
  return db.prepare(`
    SELECT *
    FROM po_requests
    WHERE id = ?
  `).get(id);
}

function updateStatus(id, status) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE po_requests
    SET status = ?, updatedAt = ?
    WHERE id = ?
  `).run(status, now, id);
  return getPoById(id);
}

module.exports = {
  createPoRequest,
  listPoRequests,
  getPoById,
  updateStatus
};
