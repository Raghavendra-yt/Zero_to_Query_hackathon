/**
 * api.js — Library Management System
 * ====================================
 * All functions call the live Flask REST API via the Vite proxy.
 * Requests to /api/* are automatically forwarded to http://localhost:5000.
 * The Flask server must be running: py backend/app.py
 */
const BASE_URL = import.meta.env.VITE_SUB0_API_URL 
  ? `${import.meta.env.VITE_SUB0_API_URL.replace(/\/$/, '')}/v1` 
  : 'https://us-east-ep1ytwk-m1.lingoql.com/v1';
// ---------------------------------------------------------------------------
// Internal helper — makes an HTTP request and unwraps the standard envelope
// { status: "success", data: ... } | { status: "error", message: ... }
// ---------------------------------------------------------------------------
async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = localStorage.getItem('library_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });

  if (response.status === 401) {
    localStorage.removeItem('library_token');
    localStorage.removeItem('library_is_authenticated');
    window.location.reload();
    throw new Error('Session expired. Please log in again.');
  }

  const json = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || `Request failed: ${response.status}`);
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export async function checkHealth() {
  return request('/health');
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * getDashboardStats()
 * Fetches metrics and overdue list from the Flask backend and merges them
 * into the shape expected by Dashboard.jsx.
 */
export async function getDashboardStats() {
  const [metrics, overdueList] = await Promise.all([
    request('/dashboard/metrics'),
    request('/dashboard/overdue'),
  ]);

  // Build categoryStats from the books list (group + sum total_copies)
  let categoryStats = [];
  try {
    const books = await request('/books');
    const catMap = {};
    books.forEach(b => {
      catMap[b.category] = (catMap[b.category] || 0) + b.total_copies;
    });
    categoryStats = Object.entries(catMap)
      .map(([category, total_copies]) => ({ category, total_copies }))
      .sort((a, b) => b.total_copies - a.total_copies);
  } catch (_) {
    // non-critical — fall back to empty
  }

  const result = {
    metrics: {
      totalBooks:   metrics.totalBooks,
      activeIssues: metrics.activeIssues,
      totalOverdue: metrics.totalOverdue,
      totalFines:   metrics.totalFines,
    },
    overdueList,
    categoryStats,
    recentTransactions: [],
  };
  
  try {
    const txns = await getIssuedBooks();
    // Sort transactions by most recent issue date first and grab the top 5
    txns.sort((a, b) => new Date(b.issue_date || b.due_date) - new Date(a.issue_date || a.due_date));
    result.recentTransactions = txns.slice(0, 5).map(t => ({
      ...t,
      id: t.transaction_id ? (String(t.transaction_id).toUpperCase().startsWith('TRX-') ? t.transaction_id : `TRX-${String(t.transaction_id).padStart(4, '0')}`) : undefined,
      date: t.issue_date ? t.issue_date.split('T')[0] : 'Today'
    }));
  } catch (_) {
    // Non-critical, fallback to empty array
  }

  return result;
}// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

/**
 * getBooks({ search, category })
 * Returns the full book catalog from the database.
 */
export async function getBooks({ search = '', category = '' } = {}) {
  const params = new URLSearchParams();
  if (search)   params.append('search',   search);
  if (category) params.append('category', category);
  const query = params.toString() ? `?${params}` : '';
  const books = await request(`/books${query}`);
  // Normalise id field and expose book_image as imageUrl for existing components
  return books.map(b => ({ ...b, id: b.book_id, imageUrl: b.book_image || null }));
}

/**
 * addBook(bookData)
 * Persists a new book to the database.
 */
export async function addBook(bookData) {
  const book = await request('/books', {
    method: 'POST',
    body: JSON.stringify({
      isbn:         bookData.isbn,
      title:        bookData.title,
      author:       bookData.author,
      total_copies: Number(bookData.total_copies),
      category:     bookData.category || 'General',
      book_image:   bookData.book_image || bookData.imageUrl || null,
    }),
  });
  return { ...book, id: book.book_id };
}

/**
 * updateBook(bookId, bookData)
 * Updates book metadata in the database.
 */
export async function updateBook(bookId, bookData) {
  const book = await request(`/books/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...bookData,
      book_image: bookData.book_image ?? bookData.imageUrl ?? undefined,
    }),
  });
  return { ...book, id: book.book_id };
}

/**
 * deleteBook(bookId)
 * Permanently removes a book from the database.
 */
export async function deleteBook(bookId) {
  return request(`/books/${bookId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

/**
 * getStudents(search?)
 * Returns all students from the database.
 */
export async function getStudents(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const students = await request(`/students${query}`);
  // Normalise to shape expected by existing components
  return students.map(s => ({
    ...s,
    id:   s.student_id,
    name: s.full_name,
  }));
}

/**
 * addStudent(studentData)
 * Registers a new student in the database.
 */
export async function addStudent(studentData) {
  const student = await request('/students', {
    method: 'POST',
    body: JSON.stringify({
      student_id: studentData.student_id || studentData.id,
      first_name: studentData.first_name || studentData.name?.split(' ')[0] || '',
      last_name:  studentData.last_name  || studentData.name?.split(' ').slice(1).join(' ') || '',
      email:      studentData.email,
      phone:      studentData.phone || studentData.contact || '',
      department: studentData.department || '',
      class_name: studentData.class_name || studentData.class_year || '',
      age:        studentData.age ? Number(studentData.age) : null,
      status:     studentData.status || 'Active',
      registration_number: studentData.registration_number || '',
    }),
  });
  return { ...student, id: student.student_id, name: student.full_name };
}

/**
 * deleteStudent(studentId)
 * Removes a student record from the database.
 */
export async function deleteStudent(studentId) {
  return request(`/students/${studentId}`, { method: 'DELETE' });
}

/**
 * getStudentTransactions(studentId)
 * Returns all transactions for a student — used for "Currently Borrowed" and "Recent History".
 */
export async function getStudentTransactions(studentId) {
  return request(`/students/${encodeURIComponent(studentId)}/transactions`);
}

/**
 * getStudentFines(studentId, status?)
 * Returns fine records for a student, optionally filtered by payment_status.
 */
export async function getStudentFines(studentId, status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/students/${encodeURIComponent(studentId)}/fines${query}`);
}

/**
 * getStudentStats(studentId)
 * Returns aggregate statistics for a student (checked out, overdue, fines etc.)
 */
export async function getStudentStats(studentId) {
  return request(`/students/${encodeURIComponent(studentId)}/stats`);
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/**
 * getIssuedBooks({ status })
 * Returns book loans, optionally filtered by status (Active/Returned/Lost).
 */
export async function getIssuedBooks({ status = '' } = {}) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const txns = await request(`/transactions${query}`);
  // Normalise field names for existing components
  return txns.map(t => ({
    ...t,
    title:                t.book_title,
    expected_return_date: t.due_date,
    student_name:         t.student_name,
  }));
}

/**
 * issueBook(data)
 * Creates a new checkout transaction.
 * data: { student_id, book_id, due_date? }
 */
export async function issueBook(data) {
  return request('/transactions/checkout', {
    method: 'POST',
    body: JSON.stringify({
      student_id: data.student_id,
      book_id:    Number(data.book_id),
      due_date:   data.due_date || undefined,
    }),
  });
}

/**
 * returnBook(transactionId)
 * Marks a transaction as returned and calculates any overdue fine.
 */
export async function returnBook(transactionId) {
  const result = await request(`/transactions/return/${transactionId}`, {
    method: 'POST',
  });
  return {
    fineAccrued: result.fine_amount,
    returnDate:  result.return_date,
    ...result,
  };
}

// ---------------------------------------------------------------------------
// Fines
// ---------------------------------------------------------------------------

/**
 * getFines({ status })
 * Returns fine records optionally filtered by payment_status.
 */
export async function getFines({ status = '' } = {}) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/fines${query}`);
}

/**
 * payFine(fineId)
 * Marks a fine as paid.
 */
export async function payFine(fineId) {
  return request(`/fines/${fineId}/pay`, { method: 'POST' });
}

/**
 * renewBook(transactionId)
 * Extends the due date of an active transaction by 14 days.
 */
export async function renewBook(transactionId) {
  return request(`/transactions/renew/${transactionId}`, { method: 'POST' });
}

/**
 * updateStudent(studentId, studentData)
 * Updates metadata for a student.
 */
export async function updateStudent(studentId, studentData) {
  const student = await request(`/students/${encodeURIComponent(studentId)}`, {
    method: 'PUT',
    body: JSON.stringify(studentData),
  });
  return { ...student, id: student.student_id, name: student.full_name };
}

/**
 * createFine(fineData)
 * Creates a new manual fine for a student.
 */
export async function createFine(fineData) {
  return request('/fines', {
    method: 'POST',
    body: JSON.stringify({
      student_id: fineData.student_id,
      amount: Number(fineData.amount),
      category: fineData.category,
      notes: fineData.notes,
      transaction_id: fineData.transaction_id || undefined,
    }),
  });
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    localStorage.setItem('library_token', data.token);
    localStorage.setItem('library_is_authenticated', 'true');
  }
  return data;
}

export async function register(name, email, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  if (data.token) {
    localStorage.setItem('library_token', data.token);
    localStorage.setItem('library_is_authenticated', 'true');
  }
  return data;
}

export async function getProfile() {
  return request('/auth/me');
}

// ---------------------------------------------------------------------------
// Misc / Stubs (unchanged behaviour)
// ---------------------------------------------------------------------------

export async function markReminderSent() { return { success: true }; }
export async function askDoubt(question) { return { answer: 'This is a mocked answer.' }; }
export async function getAICounsel(studentId) { return null; }

export function formatDate(value) { return String(value).split('T')[0]; }

/** Set to true so components can know the live backend is active. */
export const IS_FLASK_MODE = true;
