const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'secure-library-secret-key-998877';

// Initialize Database
const dbPath = path.join(__dirname, 'library.db');
const db = new sqlite3.Database(dbPath);

// Promisified Helper Functions
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// Setup Schema & Seed Data
async function initDb() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS students (
      student_id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      department TEXT,
      class_year TEXT,
      age INTEGER,
      status TEXT NOT NULL DEFAULT 'Active',
      registration_number TEXT
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS books (
      book_id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      category TEXT,
      book_image TEXT
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id TEXT PRIMARY KEY,
      book_id INTEGER NOT NULL,
      student_id TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      status TEXT NOT NULL DEFAULT 'Active'
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS fines (
      fine_id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE NOT NULL,
      fine_amount REAL NOT NULL DEFAULT 0.0,
      payment_status TEXT NOT NULL DEFAULT 'Pending',
      paid_date TEXT
    );
  `);

  // Auto-seed Database on First Run
  const userCount = (await dbGet('SELECT COUNT(*) as count FROM users')).count;
  if (userCount === 0) {
    console.log('-> Seeding default admin user...');
    const hashed = bcrypt.hashSync('password123', 10);
    await dbRun('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', ['Library Admin', 'admin@library.com', hashed]);
  }

  const studentCount = (await dbGet('SELECT COUNT(*) as count FROM students')).count;
  if (studentCount === 0) {
    console.log('-> Seeding database with initial sample data...');
    
    // Seed Students
    const studentsData = [
      ['ST-8492', 'Eleanor', 'Vance', 'evance@uni.edu', '1234567890', 'Active'],
      ['ST-9104', 'Arthur', 'Hastings', 'ahastings@uni.edu', '0987654321', 'Active'],
      ['ST-1102', 'Jane', 'Eyre', 'jeyre@uni.edu', '5551234567', 'Active'],
      ['ST-4431', 'Holden', 'Caulfield', 'hcaulfield@uni.edu', '5559876543', 'Active'],
      ['ST-1984', 'Winston', 'Smith', 'wsmith@uni.edu', '5558889999', 'Active'],
      ['ST-0001', 'John', 'Doe', 'jdoe@uni.edu', '1112223333', 'Active'],
      ['ST-0002', 'Jane', 'Smith', 'jsmith@uni.edu', '4445556666', 'Active'],
    ];
    for (const s of studentsData) {
      await dbRun('INSERT INTO students (student_id, first_name, last_name, email, phone, status) VALUES (?, ?, ?, ?, ?, ?)', s);
    }

    // Seed Books
    const booksData = [
      ['978-0465050659', 'The Design of Everyday Things', 'Don Norman', 5, 4, 'Literature'],
      ['978-0132350884', 'Clean Code', 'Robert C. Martin', 3, 2, 'Computer Science'],
      ['978-1999026402', 'Refactoring UI', 'Adam Wathan', 4, 4, 'Computer Science'],
      ['978-0262033848', 'Introduction to Algorithms', 'Thomas H. Cormen', 6, 5, 'Computer Science'],
      ['978-0374533557', 'Thinking, Fast and Slow', 'Daniel Kahneman', 8, 8, 'Literature'],
      ['978-0141187884', 'The Haunting of Hill House', 'Shirley Jackson', 2, 1, 'Literature'],
      ['978-0007120857', 'The Mysterious Affair at Styles', 'Agatha Christie', 3, 2, 'Literature'],
      ['978-0415487412', 'Principles of Mathematics', 'Bertrand Russell', 1, 0, 'Mathematics'],
      ['978-0316769174', 'The Catcher in the Rye', 'J.D. Salinger', 4, 3, 'Literature'],
      ['978-0451524935', '1984', 'George Orwell', 5, 3, 'Literature'],
    ];
    for (const b of booksData) {
      await dbRun('INSERT INTO books (isbn, title, author, total_copies, available_copies, category) VALUES (?, ?, ?, ?, ?, ?)', b);
    }

    // Seed Transactions
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    const overdueIssue = new Date(today.getTime() - 40 * 86400000);
    const overdueDue = new Date(overdueIssue.getTime() + 14 * 86400000);

    const txnsData = [
      ['TRX-0001', 6, 'ST-8492', formatDate(overdueIssue), formatDate(overdueDue), 'Active'],
      ['TRX-0002', 7, 'ST-9104', formatDate(new Date(overdueIssue.getTime() + 2 * 86400000)), formatDate(new Date(overdueDue.getTime() + 2 * 86400000)), 'Active'],
      ['TRX-0003', 8, 'ST-1102', formatDate(new Date(overdueIssue.getTime() - 10 * 86400000)), formatDate(new Date(overdueDue.getTime() - 10 * 86400000)), 'Active'],
      ['TRX-0004', 9, 'ST-4431', formatDate(new Date(overdueIssue.getTime() + 4 * 86400000)), formatDate(new Date(overdueDue.getTime() + 4 * 86400000)), 'Active'],
      ['TRX-0005', 10, 'ST-1984', formatDate(new Date(overdueIssue.getTime() - 5 * 86400000)), formatDate(new Date(overdueDue.getTime() - 5 * 86400000)), 'Active'],
      ['TRX-0006', 2, 'ST-0001', formatDate(new Date(today.getTime() - 5 * 86400000)), formatDate(new Date(today.getTime() + 9 * 86400000)), 'Active'],
      ['TRX-0007', 4, 'ST-0002', formatDate(new Date(today.getTime() - 3 * 86400000)), formatDate(new Date(today.getTime() + 11 * 86400000)), 'Active'],
    ];
    for (const t of txnsData) {
      await dbRun('INSERT INTO transactions (transaction_id, book_id, student_id, issue_date, due_date, status) VALUES (?, ?, ?, ?, ?, ?)', t);
    }

    // Seed Fines
    await dbRun('INSERT INTO fines (transaction_id, fine_amount, payment_status) VALUES (?, ?, ?)', ['TRX-0001', 260.0, 'Pending']);
    await dbRun('INSERT INTO fines (transaction_id, fine_amount, payment_status) VALUES (?, ?, ?)', ['TRX-0002', 240.0, 'Pending']);
    await dbRun('INSERT INTO fines (transaction_id, fine_amount, payment_status) VALUES (?, ?, ?)', ['TRX-0003', 360.0, 'Pending']);
    await dbRun('INSERT INTO fines (transaction_id, fine_amount, payment_status) VALUES (?, ?, ?)', ['TRX-0004', 220.0, 'Pending']);
    await dbRun('INSERT INTO fines (transaction_id, fine_amount, payment_status) VALUES (?, ?, ?)', ['TRX-0005', 310.0, 'Pending']);

    console.log('[OK] Seed data inserted successfully.');
  }
}
initDb().catch(console.error);

// Middleware
app.use(cors());
app.use(express.json());

// Serve Built React Static Frontend
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Global Auth Verification Middleware for /api/
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  if (req.path === '/api/v1/health' || req.path.startsWith('/api/v1/auth/')) return next();
  if (req.method === 'OPTIONS') return next();

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Authentication token missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.currentUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Authentication token expired or invalid.' });
  }
});

// Helper for Envelope Responses
const success = (res, data, code = 200) => res.status(code).json({ status: 'success', data });
const error = (res, message, code = 400) => res.status(code).json({ status: 'error', message });

// ── Health Probe ─────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  success(res, { status: 'ok', timestamp: new Date().toISOString() });
});

// ── Auth Endpoints ───────────────────────────────────────────────────────────
app.post('/api/v1/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return error(res, 'Name, email, and password are required.');
  
  const existing = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) return error(res, 'Email address is already registered.');

  const hashed = bcrypt.hashSync(password, 10);
  const result = await dbRun('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email.toLowerCase(), hashed]);
  const user = { id: result.lastID, name, email: email.toLowerCase() };
  const token = jwt.sign({ user_id: user.id }, JWT_SECRET, { expiresIn: '24h' });
  
  success(res, { user, token }, 201);
});

app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return error(res, 'Email and password are required.');

  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return error(res, 'Invalid email or password.', 401);
  }

  const userDict = { id: user.id, name: user.name, email: user.email };
  const token = jwt.sign({ user_id: user.id }, JWT_SECRET, { expiresIn: '24h' });

  success(res, { user: userDict, token });
});

app.get('/api/v1/auth/me', async (req, res) => {
  const user = await dbGet('SELECT id, name, email FROM users WHERE id = ?', [req.currentUser.user_id]);
  if (!user) return error(res, 'User not found.', 401);
  success(res, { user });
});

// ── Books Endpoints ──────────────────────────────────────────────────────────
app.get('/api/v1/books', async (req, res) => {
  const search = (req.query.search || '').trim().toLowerCase();
  const category = (req.query.category || '').trim();

  let books = await dbAll('SELECT * FROM books ORDER BY book_id ASC');
  if (search) {
    books = books.filter(b => b.title.toLowerCase().includes(search) || b.author.toLowerCase().includes(search) || b.isbn.includes(search));
  }
  if (category) {
    books = books.filter(b => b.category === category);
  }
  success(res, books);
});

app.post('/api/v1/books', async (req, res) => {
  const { isbn, title, author, total_copies = 1, category = 'General', book_image = null } = req.body || {};
  if (!isbn || !title || !author) return error(res, 'ISBN, title, and author are required.');

  try {
    const copies = parseInt(total_copies) || 1;
    const result = await dbRun('INSERT INTO books (isbn, title, author, total_copies, available_copies, category, book_image) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [isbn, title, author, copies, copies, category, book_image]);
    const book = await dbGet('SELECT * FROM books WHERE book_id = ?', [result.lastID]);
    success(res, book, 201);
  } catch (err) {
    error(res, err.message);
  }
});

app.put('/api/v1/books/:id', async (req, res) => {
  const bookId = req.params.id;
  const { title, author, category, book_image, total_copies } = req.body || {};
  
  const book = await dbGet('SELECT * FROM books WHERE book_id = ?', [bookId]);
  if (!book) return error(res, 'Book not found.', 404);

  const updatedTitle = title !== undefined ? title : book.title;
  const updatedAuthor = author !== undefined ? author : book.author;
  const updatedCategory = category !== undefined ? category : book.category;
  const updatedImage = book_image !== undefined ? book_image : book.book_image;
  const updatedTotal = total_copies !== undefined ? parseInt(total_copies) : book.total_copies;
  
  await dbRun('UPDATE books SET title = ?, author = ?, category = ?, book_image = ?, total_copies = ? WHERE book_id = ?',
    [updatedTitle, updatedAuthor, updatedCategory, updatedImage, updatedTotal, bookId]);

  const updatedBook = await dbGet('SELECT * FROM books WHERE book_id = ?', [bookId]);
  success(res, updatedBook);
});

app.delete('/api/v1/books/:id', async (req, res) => {
  await dbRun('DELETE FROM books WHERE book_id = ?', [req.params.id]);
  success(res, { message: 'Book deleted successfully.' });
});

// ── Students Endpoints ───────────────────────────────────────────────────────
app.get('/api/v1/students', async (req, res) => {
  const search = (req.query.search || '').trim().toLowerCase();
  let students = await dbAll('SELECT * FROM students ORDER BY student_id ASC');
  if (search) {
    students = students.filter(s => 
      s.first_name.toLowerCase().includes(search) || 
      s.last_name.toLowerCase().includes(search) || 
      s.student_id.toLowerCase().includes(search) || 
      s.email.toLowerCase().includes(search)
    );
  }
  const formatted = students.map(s => ({ ...s, full_name: `${s.first_name} ${s.last_name}` }));
  success(res, formatted);
});

app.post('/api/v1/students', async (req, res) => {
  const { student_id, first_name, last_name, email, phone = '', department = '', class_year = '', age = null, status = 'Active', registration_number = '' } = req.body || {};
  if (!student_id || !first_name || !last_name || !email) return error(res, 'Student ID, First Name, Last Name, and Email are required.');

  try {
    await dbRun('INSERT INTO students (student_id, first_name, last_name, email, phone, department, class_year, age, status, registration_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [student_id, first_name, last_name, email, phone, department, class_year, age, status, registration_number]);
    const student = await dbGet('SELECT * FROM students WHERE student_id = ?', [student_id]);
    success(res, { ...student, full_name: `${student.first_name} ${student.last_name}` }, 201);
  } catch (err) {
    error(res, err.message);
  }
});

app.put('/api/v1/students/:id', async (req, res) => {
  const s = await dbGet('SELECT * FROM students WHERE student_id = ?', [req.params.id]);
  if (!s) return error(res, 'Student not found.', 404);

  const b = req.body || {};
  await dbRun('UPDATE students SET first_name = ?, last_name = ?, email = ?, phone = ?, department = ?, class_year = ?, status = ? WHERE student_id = ?',
    [b.first_name ?? s.first_name, b.last_name ?? s.last_name, b.email ?? s.email, b.phone ?? s.phone, b.department ?? s.department, b.class_year ?? s.class_year, b.status ?? s.status, req.params.id]);

  const updated = await dbGet('SELECT * FROM students WHERE student_id = ?', [req.params.id]);
  success(res, { ...updated, full_name: `${updated.first_name} ${updated.last_name}` });
});

app.delete('/api/v1/students/:id', async (req, res) => {
  await dbRun('DELETE FROM students WHERE student_id = ?', [req.params.id]);
  success(res, { message: 'Student deleted successfully.' });
});

app.get('/api/v1/students/:id/transactions', async (req, res) => {
  const txns = await dbAll(`
    SELECT t.*, b.title as book_title 
    FROM transactions t 
    JOIN books b ON t.book_id = b.book_id 
    WHERE t.student_id = ?
  `, [req.params.id]);
  success(res, txns);
});

app.get('/api/v1/students/:id/fines', async (req, res) => {
  const fines = await dbAll('SELECT * FROM fines WHERE student_id = ?', [req.params.id]);
  success(res, fines);
});

app.get('/api/v1/students/:id/stats', async (req, res) => {
  const activeCount = (await dbGet("SELECT COUNT(*) as c FROM transactions WHERE student_id = ? AND status = 'Active'", [req.params.id])).c;
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = (await dbGet("SELECT COUNT(*) as c FROM transactions WHERE student_id = ? AND status = 'Active' AND due_date < ?", [req.params.id, today])).c;
  const totalFines = (await dbGet("SELECT SUM(fine_amount) as s FROM fines f JOIN transactions t ON f.transaction_id = t.transaction_id WHERE t.student_id = ? AND f.payment_status = 'Pending'", [req.params.id])).s || 0;

  success(res, { active_loans: activeCount, overdue_loans: overdueCount, pending_fines: totalFines });
});

// ── Transactions Endpoints ───────────────────────────────────────────────────
app.get('/api/v1/transactions', async (req, res) => {
  const statusFilter = (req.query.status || '').trim();
  let sql = `
    SELECT t.*, (s.first_name || ' ' || s.last_name) as student_name, b.title as book_title
    FROM transactions t
    JOIN students s ON t.student_id = s.student_id
    JOIN books b ON t.book_id = b.book_id
  `;
  if (statusFilter) sql += ` WHERE t.status = '${statusFilter}'`;
  sql += ` ORDER BY t.issue_date DESC`;
  const txns = await dbAll(sql);
  success(res, txns);
});

app.post('/api/v1/transactions/checkout', async (req, res) => {
  const { student_id, book_id, due_date } = req.body || {};
  if (!student_id || !book_id) return error(res, 'Student ID and Book ID are required.');

  const book = await dbGet('SELECT * FROM books WHERE book_id = ?', [book_id]);
  if (!book) return error(res, 'Book not found.', 404);
  if (book.available_copies <= 0) return error(res, 'No copies available for checkout.');

  const today = new Date();
  const format = d => d.toISOString().split('T')[0];
  const defaultDue = new Date(today.getTime() + 14 * 86400000);
  const finalDue = due_date || format(defaultDue);
  const count = (await dbGet('SELECT COUNT(*) as c FROM transactions')).c;
  const txnId = `TRX-${String(count + 1).padStart(4, '0')}`;

  await dbRun('INSERT INTO transactions (transaction_id, book_id, student_id, issue_date, due_date, status) VALUES (?, ?, ?, ?, ?, ?)',
    [txnId, book_id, student_id, format(today), finalDue, 'Active']);
  await dbRun('UPDATE books SET available_copies = available_copies - 1 WHERE book_id = ?', [book_id]);

  const txn = await dbGet('SELECT * FROM transactions WHERE transaction_id = ?', [txnId]);
  success(res, txn, 201);
});

app.post('/api/v1/transactions/return/:id', async (req, res) => {
  const txnId = req.params.id;
  const txn = await dbGet('SELECT * FROM transactions WHERE transaction_id = ?', [txnId]);
  if (!txn) return error(res, 'Transaction not found.', 404);

  const todayStr = new Date().toISOString().split('T')[0];
  await dbRun("UPDATE transactions SET status = 'Returned', return_date = ? WHERE transaction_id = ?", [todayStr, txnId]);
  await dbRun('UPDATE books SET available_copies = available_copies + 1 WHERE book_id = ?', [txn.book_id]);

  let fineAmount = 0;
  if (new Date(todayStr) > new Date(txn.due_date)) {
    const diffDays = Math.ceil((new Date(todayStr) - new Date(txn.due_date)) / (1000 * 60 * 60 * 24));
    fineAmount = diffDays * 10;
    if (fineAmount > 0) {
      await dbRun('INSERT OR REPLACE INTO fines (transaction_id, fine_amount, payment_status) VALUES (?, ?, ?)', [txnId, fineAmount, 'Pending']);
    }
  }

  success(res, { transaction_id: txnId, return_date: todayStr, fine_amount: fineAmount });
});

app.post('/api/v1/transactions/renew/:id', async (req, res) => {
  const txnId = req.params.id;
  const txn = await dbGet('SELECT * FROM transactions WHERE transaction_id = ?', [txnId]);
  if (!txn) return error(res, 'Transaction not found.', 404);

  const currentDue = new Date(txn.due_date);
  const newDue = new Date(currentDue.getTime() + 14 * 86400000).toISOString().split('T')[0];
  await dbRun('UPDATE transactions SET due_date = ? WHERE transaction_id = ?', [newDue, txnId]);

  success(res, { transaction_id: txnId, due_date: newDue });
});

// ── Fines Endpoints ──────────────────────────────────────────────────────────
app.get('/api/v1/fines', async (req, res) => {
  const statusFilter = (req.query.status || '').trim();
  let sql = `
    SELECT f.*, t.student_id, (s.first_name || ' ' || s.last_name) as student_name, b.title as book_title
    FROM fines f
    JOIN transactions t ON f.transaction_id = t.transaction_id
    JOIN students s ON t.student_id = s.student_id
    JOIN books b ON t.book_id = b.book_id
  `;
  if (statusFilter) sql += ` WHERE f.payment_status = '${statusFilter}'`;
  const fines = await dbAll(sql);
  success(res, fines);
});

app.post('/api/v1/fines', async (req, res) => {
  const { student_id, amount, notes, transaction_id } = req.body || {};
  if (!student_id || !amount) return error(res, 'Student ID and amount are required.');

  const txnId = transaction_id || `MANUAL-${Date.now()}`;
  await dbRun('INSERT INTO fines (transaction_id, fine_amount, payment_status) VALUES (?, ?, ?)', [txnId, parseFloat(amount), 'Pending']);
  const fine = await dbGet('SELECT * FROM fines WHERE transaction_id = ?', [txnId]);
  success(res, fine, 201);
});

app.post('/api/v1/fines/:id/pay', async (req, res) => {
  const fineId = req.params.id;
  const todayStr = new Date().toISOString().split('T')[0];
  await dbRun("UPDATE fines SET payment_status = 'Paid', paid_date = ? WHERE fine_id = ?", [todayStr, fineId]);
  const fine = await dbGet('SELECT * FROM fines WHERE fine_id = ?', [fineId]);
  success(res, fine);
});

// ── Dashboard Metrics & Overdue Report ──────────────────────────────────────
app.get('/api/v1/dashboard/metrics', async (req, res) => {
  const totalBooks = (await dbGet('SELECT SUM(total_copies) as s FROM books')).s || 0;
  const activeIssues = (await dbGet("SELECT COUNT(*) as c FROM transactions WHERE status = 'Active'")).c || 0;
  const today = new Date().toISOString().split('T')[0];
  const totalOverdue = (await dbGet("SELECT COUNT(*) as c FROM transactions WHERE status = 'Active' AND due_date < ?", [today])).c || 0;
  const totalFines = (await dbGet("SELECT SUM(fine_amount) as s FROM fines WHERE payment_status = 'Pending'")).s || 0;

  success(res, { totalBooks, activeIssues, totalOverdue, totalFines });
});

app.get('/api/v1/dashboard/overdue', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const overdue = await dbAll(`
    SELECT t.transaction_id, (s.first_name || ' ' || s.last_name) as student_name, s.email as student_email, b.title as book_title, t.due_date, f.fine_amount
    FROM transactions t
    JOIN students s ON t.student_id = s.student_id
    JOIN books b ON t.book_id = b.book_id
    LEFT JOIN fines f ON t.transaction_id = f.transaction_id
    WHERE t.status = 'Active' AND t.due_date < ?
    ORDER BY t.due_date ASC
  `, [today]);

  const formatted = overdue.map(item => {
    const due = new Date(item.due_date);
    const diff = Math.ceil((new Date(today) - due) / (86400000));
    return { ...item, days_overdue: diff, fine_accrued: item.fine_amount || (diff * 10) };
  });

  success(res, formatted);
});

// ── Fallback SPA Router ──────────────────────────────────────────────────────
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('Library Management System API Server Running.');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[*] Node Express Library Management API running on port ${PORT}`);
});
