import React, { useState, useEffect } from 'react';
import { getStudents, getBooks, getIssuedBooks, issueBook, returnBook, formatDate, getDashboardStats, createFine, getStudentTransactions } from '../lib/api';

export default function IssueReturnForm({ defaultTab = 'issue', prefilledStudent = null, clearPrefilledStudent = null }) {
  const [mode, setMode] = useState(defaultTab);

  // Sync prefilled student details
  useEffect(() => {
    if (prefilledStudent) {
      handleStudentSelect(prefilledStudent);
      if (clearPrefilledStudent) {
        clearPrefilledStudent();
      }
    }
  }, [prefilledStudent]);
  
  // Data lists from backend
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search Autocomplete states
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  const [bookSearch, setBookSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookDropdown, setShowBookDropdown] = useState(false);

  // Manual input state variables for Issue Form
  const [studentName, setStudentName] = useState('');
  const [classGrade, setClassGrade] = useState('');
  const [section, setSection] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentClassName, setStudentClassName] = useState('');
  const [studentClassSection, setStudentClassSection] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCategory, setBookCategory] = useState('');
  const [accessionNumber, setAccessionNumber] = useState('');
  const [editionYear, setEditionYear] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');
  const [physicalCondition, setPhysicalCondition] = useState('Excellent');

  const [txSearch, setTxSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTxDropdown, setShowTxDropdown] = useState(false);

  // Issue Dates
  const [duration, setDuration] = useState('14');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

  // Return Dates
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnPreview, setReturnPreview] = useState(null);
  const [returnImage, setReturnImage] = useState(null);
  const [remarks, setRemarks] = useState('');

  // Fine fields
  const [fineStudentSearch, setFineStudentSearch] = useState('');
  const [showFineStudentDropdown, setShowFineStudentDropdown] = useState(false);
  const [fineCategory, setFineCategory] = useState('Overdue');
  const [fineAmount, setFineAmount] = useState('');
  const [fineNotes, setFineNotes] = useState('');
  const [studentTransactions, setStudentTransactions] = useState([]);
  const [selectedTxId, setSelectedTxId] = useState('');

  // Status message
  const [status, setStatus] = useState(null);

  // Sync tab status with defaultTab prop
  useEffect(() => {
    setMode(defaultTab);
    setStatus(null);
  }, [defaultTab]);

  // Load backend data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsData, booksData, issuedData, statsData] = await Promise.all([
        getStudents(),
        getBooks(),
        getIssuedBooks({ status: 'Active' }),  // Flask expects title-case status
        getDashboardStats()
      ]);

      setStudents(studentsData);
      setBooks(booksData);
      // Active transactions come back filtered from the backend
      setActiveTransactions(issuedData);
      setDashboardStats(statsData);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Failed to load records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mode]);

  // Fetch student transactions when selectedStudent changes (for fine linking)
  useEffect(() => {
    if (selectedStudent) {
      const sid = selectedStudent.student_id || selectedStudent.id;
      getStudentTransactions(sid)
        .then(txns => {
          setStudentTransactions(txns);
        })
        .catch(console.error);
    } else {
      setStudentTransactions([]);
    }
    setSelectedTxId('');
  }, [selectedStudent]);

  // Calculate Due Date dynamically
  useEffect(() => {
    const parsed = parseInt(duration, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const date = new Date(issueDate);
      date.setDate(date.getDate() + parsed);
      setDueDate(date.toISOString().split('T')[0]);
    } else {
      setDueDate('Invalid duration');
    }
  }, [issueDate, duration]);

  // Calculate dynamic return preview details
  useEffect(() => {
    if (!selectedTransaction) {
      setReturnPreview(null);
      return;
    }

    const expected = new Date(selectedTransaction.expected_return_date);
    const actual = new Date(returnDate);
    const diffTime = actual.getTime() - expected.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const overdueDays = diffDays > 0 ? diffDays : 0;
    const currentFine = overdueDays * 10; // ₹10 or $10 per day depending on representation

    setReturnPreview({
      ...selectedTransaction,
      overdueDays,
      currentFine
    });
  }, [selectedTransaction, returnDate]);

  // Handle Autocomplete Clears
  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentSearch('');
    setStudentName('');
    setClassGrade('');
    setSection('');
    setContactPhone('');
    setStudentRollNumber('');
    setStudentEmail('');
    setStudentClassName('');
    setStudentClassSection('');
    setStudentAge('');
  };

  const handleClearBook = () => {
    setSelectedBook(null);
    setBookSearch('');
    setBookTitle('');
    setBookAuthor('');
    setBookCategory('');
    setAccessionNumber('');
    setEditionYear('');
    setShelfLocation('');
    setPhysicalCondition('Excellent');
  };

  const handleClearTransaction = () => {
    setSelectedTransaction(null);
    setTxSearch('');
    setReturnImage(null);
    setRemarks('');
  };

  const handleIssueSubmit = async (e) => {
    if (e) e.preventDefault();

    // Resolve from typed values if not explicitly selected from autocomplete
    let studentToUse = selectedStudent;
    if (!studentToUse && studentRollNumber.trim()) {
      studentToUse = students.find(s => s.id === studentRollNumber || s.student_id === studentRollNumber);
    }

    let bookToUse = selectedBook;
    if (!bookToUse && bookTitle.trim()) {
      bookToUse = books.find(b => b.title.toLowerCase() === bookTitle.toLowerCase() || b.isbn === accessionNumber);
    }

    if (!studentToUse) {
      setStatus({ type: 'error', text: 'Please select a student from the autocomplete list or enter a valid Student ID.' });
      return;
    }
    if (!bookToUse) {
      setStatus({ type: 'error', text: 'Please select a book from the autocomplete list or enter a valid Book Title/Accession Number.' });
      return;
    }
    if (bookToUse.available_copies < 1) {
      setStatus({ type: 'error', text: 'No copies of this book are currently available.' });
      return;
    }

    try {
      setStatus({ type: 'processing', text: 'Registering transaction...' });

      const response = await issueBook({
        student_id: studentToUse.student_id || studentToUse.id,
        book_id:    bookToUse.book_id    || bookToUse.id,
        due_date:   dueDate,
      });

      const transactionId = response.transaction_id;
      const formattedTxId = String(transactionId).toUpperCase().startsWith('TRX-') ? transactionId : `TRX-${String(transactionId).padStart(4, '0')}`;

      setStatus({ 
        type: 'success', 
        text: `Book "${bookToUse.title}" successfully issued to ${studentToUse.name}! Unique Transaction ID generated: ${formattedTxId}` 
      });
      handleClearStudent();
      handleClearBook();
      fetchData();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: err.message || 'Failed to issue book.' });
    }
  };

  const handleReturnSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTransaction) {
      setStatus({ type: 'error', text: 'Please select an active transaction.' });
      return;
    }

    try {
      setStatus({ type: 'processing', text: 'Processing asset return...' });
      
      const result = await returnBook(selectedTransaction.id || selectedTransaction.transaction_id);

      setStatus({ 
        type: 'success', 
        text: `Book returned successfully! ${result.fineAccrued > 0 ? `Overdue fee of $${result.fineAccrued.toFixed(2)} posted.` : 'No overdue fees.'}`
      });
      handleClearTransaction();
      fetchData();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: err.message || 'Failed to process return.' });
    }
  };

  // Filter Autocompletes
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentName.toLowerCase()) || 
    (s.id && s.id.toLowerCase().includes(studentName.toLowerCase()))
  );

  const filteredFineStudents = students.filter(s => 
    s.name.toLowerCase().includes(fineStudentSearch.toLowerCase()) || 
    (s.id && s.id.toLowerCase().includes(fineStudentSearch.toLowerCase()))
  );

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) || 
    (b.isbn && b.isbn.toLowerCase().includes(bookSearch.toLowerCase()))
  );

  const filteredTransactions = activeTransactions.filter(t => {
    const q = txSearch.toLowerCase();
    const formattedId = String(t.transaction_id || t.id).toLowerCase().startsWith('trx-') ? String(t.transaction_id || t.id).toLowerCase() : `trx-${String(t.transaction_id || t.id).padStart(4, '0')}`;
    return (
      String(t.transaction_id || t.id).includes(q) ||
      formattedId.includes(q) ||
      t.student_name.toLowerCase().includes(q) || 
      t.title.toLowerCase().includes(q)
    );
  });

  // Helper selectors
  function handleStudentSelect(student) {
    setSelectedStudent(student);
    setStudentName(student.name);
    setClassGrade(student.class_grade || 'Grade 10');
    setSection(student.section || 'A');
    setContactPhone(student.contact || '');
    setStudentRollNumber(student.id || '');
    setStudentEmail(student.email || `${student.name.toLowerCase().replace(/\s+/g, '')}@library.edu`);
    setStudentClassName('');
    setStudentClassSection('');
    setStudentAge('');
    setShowStudentDropdown(false);
  }

  function handleFineStudentSelect(student) {
    setSelectedStudent(student);
    setFineStudentSearch(student.name);
    setShowFineStudentDropdown(false);
  }

  function handleBookSelect(book) {
    setSelectedBook(book);
    setBookSearch(`${book.title} (ISBN: ${book.isbn || 'N/A'})`);
    setBookTitle(book.title);
    setBookAuthor(book.author || '');
    setBookCategory(book.category || '');
    setAccessionNumber(book.accession_number || `ACC-${book.id}-001`);
    setEditionYear(book.edition || '2023 (1st Edition)');
    setShelfLocation(book.shelf || book.shelf_location || `Rack ${String.fromCharCode(65 + (book.id % 6))}, Shelf ${(book.id % 4) + 1}`);
    setPhysicalCondition(book.condition || 'Excellent');
    setShowBookDropdown(false);
  }

  function handleTxSelect(tx) {
    setSelectedTransaction(tx);
    setTxSearch(`${tx.student_name} — ${tx.title}`);
    setShowTxDropdown(false);
  }

  // Billing invoice context calculations
  const isStudentActive = selectedStudent || studentName.trim() !== '' || (mode === 'fine' && fineStudentSearch.trim() !== '');
  const isTransactionActive = selectedTransaction;

  const studentInitials = selectedStudent 
    ? selectedStudent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : mode === 'fine' && fineStudentSearch
      ? fineStudentSearch.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : studentName 
        ? studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : selectedTransaction
          ? selectedTransaction.student_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
          : 'JS';

  const studentNameDisplay = selectedStudent 
    ? selectedStudent.name 
    : mode === 'fine' && fineStudentSearch
      ? fineStudentSearch
      : studentName 
        ? studentName 
        : selectedTransaction
          ? selectedTransaction.student_name
          : 'John Smith';

  const studentIdDisplay = selectedStudent 
    ? selectedStudent.id 
    : studentRollNumber 
      ? studentRollNumber 
      : selectedTransaction
        ? selectedTransaction.student_id || `ST-${selectedTransaction.id}`
        : 'STU-2024-001';

  // Overdue List for student to show dynamic pending charges
  const studentOverdues = (dashboardStats?.overdueList || []).filter(item => {
    const isCurrentReturn = mode === 'return' && selectedTransaction && (item.transaction_id === selectedTransaction.id || item.transaction_id === selectedTransaction.transaction_id);
    return item.student_name.toLowerCase() === studentNameDisplay.toLowerCase() && !isCurrentReturn;
  });

  // Compile billing receipt items
  let lineItems = [];
  let totalDue = 0;

  const defaultLineItems = [
    {
      title: '"Advanced Data Structures"',
      subtitle: 'ISBN: 978-0132847377',
      tag: '5 days overdue',
      tagIcon: 'schedule',
      amount: 5.00
    },
    {
      title: 'Replacement ID Card',
      subtitle: 'Admin Fee',
      amount: 15.00
    }
  ];

  if (isStudentActive || isTransactionActive) {
    // If returned overdue item
    if (mode === 'return' && returnPreview) {
      lineItems.push({
        title: `"${returnPreview.title}"`,
        subtitle: `Accession: ${returnPreview.accession_number || 'N/A'}`,
        tag: returnPreview.overdueDays > 0 ? `${returnPreview.overdueDays} days overdue` : null,
        tagIcon: 'schedule',
        amount: returnPreview.currentFine
      });
      totalDue += returnPreview.currentFine;
    }

    // Other overdue items for the student
    studentOverdues.forEach(item => {
      lineItems.push({
        title: `"${item.title}"`,
        subtitle: `Expected: ${item.expected_return_date}`,
        tag: `${item.delay_days || 7} days overdue`,
        tagIcon: 'schedule',
        amount: item.fine_amount || 70.00
      });
      totalDue += item.fine_amount || 70.00;
    });

    // If checkout mode, add checkout item
    if (mode === 'issue' && (selectedBook || bookTitle.trim())) {
      lineItems.push({
        title: `"${selectedBook ? selectedBook.title : bookTitle}"`,
        subtitle: `Lending period: ${duration} Days`,
        amount: 0.00
      });
    }

    // If fine mode, add fine item
    if (mode === 'fine' && fineAmount) {
      const parsedAmount = parseFloat(fineAmount);
      if (!isNaN(parsedAmount)) {
        lineItems.push({
          title: `Fine: ${fineCategory}`,
          subtitle: fineNotes || 'Fine assessment',
          amount: parsedAmount
        });
        totalDue += parsedAmount;
      }
    }

    // Fallback if no pending fee and no items
    if (lineItems.length === 0) {
      lineItems.push({
        title: 'Standard Lending Agreement',
        subtitle: 'Librarian Checkout Authorized',
        amount: 0.00
      });
    }
  } else {
    lineItems = defaultLineItems;
    totalDue = 20.00;
  }

  const hasFines = totalDue > 0;
  const invoiceNumber = selectedTransaction
    ? `INV-2026-${selectedTransaction.id || selectedTransaction.transaction_id}`
    : selectedStudent
      ? `INV-2026-${selectedStudent.id.replace(/\D/g, '') || '001'}`
      : 'INV-2023-8842';

  const handleFineSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStudent) {
      setStatus({ type: 'error', text: 'Please select a student.' });
      return;
    }
    const amount = parseFloat(fineAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatus({ type: 'error', text: 'Please enter a valid fine amount.' });
      return;
    }

    try {
      setStatus({ type: 'processing', text: 'Applying fine...' });
      await createFine({
        student_id: selectedStudent.student_id || selectedStudent.id,
        amount: amount,
        category: fineCategory,
        notes: fineNotes,
        transaction_id: selectedTxId || undefined,
      });
      setStatus({ 
        type: 'success', 
        text: `Fine of ₹${amount.toFixed(2)} (${fineCategory}) successfully applied to ${selectedStudent.name}!${selectedTxId ? ` Associated with TRX-${String(selectedTxId).padStart(4, '0')}.` : ''}` 
      });
      setFineAmount('');
      setFineNotes('');
      setFineStudentSearch('');
      setSelectedStudent(null);
      setSelectedTxId('');
      fetchData();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: err.message || 'Failed to apply fine.' });
    }
  };

  const handleInvoiceAction = (e) => {
    if (mode === 'return') {
      handleReturnSubmit(e);
    } else if (mode === 'fine') {
      handleFineSubmit(e);
    } else {
      handleIssueSubmit(e);
    }
  };

  const fullStudent = selectedTransaction 
    ? students.find(s => s.student_id === selectedTransaction.student_id || s.id === selectedTransaction.student_id)
    : null;

  const fullBook = selectedTransaction
    ? books.find(b => b.book_id === selectedTransaction.book_id || b.id === selectedTransaction.book_id)
    : null;

  return (
    <div className="max-w-container_max_width mx-auto text-left">
      <div className="mb-4">
        <h2 className="font-headline-sm text-[20px] text-primary mb-1">Transaction & Billing Hub</h2>
        
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-md p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 bg-primary-fixed rounded-md text-primary">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>sync_alt</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-[16px] text-on-surface">Process Transaction</h3>
                
              </div>
            </div>

            {/* Transaction Type Toggle */}
            <div className="flex gap-2 p-1 bg-surface-container-low rounded-md border border-outline-variant w-fit mb-6">
              <label className="cursor-pointer">
                <input 
                  checked={mode === 'issue'} 
                  onChange={() => { setMode('issue'); setStatus(null); }}
                  className="peer sr-only" 
                  name="transaction_type" 
                  type="radio" 
                  value="issue"
                />
                <div className="px-4 py-1.5 rounded-md font-label-md text-[11px] peer-checked:bg-surface-container-lowest peer-checked:shadow-sm peer-checked:text-primary text-on-surface-variant transition-all flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">outbox</span>
                  Issue
                </div>
              </label>
              <label className="cursor-pointer">
                <input 
                  checked={mode === 'return'} 
                  onChange={() => { setMode('return'); setStatus(null); }}
                  className="peer sr-only" 
                  name="transaction_type" 
                  type="radio" 
                  value="return"
                />
                <div className="px-4 py-1.5 rounded-md font-label-md text-[11px] peer-checked:bg-surface-container-lowest peer-checked:shadow-sm peer-checked:text-primary text-on-surface-variant transition-all flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">move_to_inbox</span>
                  Return
                </div>
              </label>
              <label className="cursor-pointer">
                <input 
                  checked={mode === 'fine'} 
                  onChange={() => { setMode('fine'); setStatus(null); }}
                  className="peer sr-only" 
                  name="transaction_type" 
                  type="radio" 
                  value="fine"
                />
                <div className="px-4 py-1.5 rounded-md font-label-md text-[11px] peer-checked:bg-surface-container-lowest peer-checked:shadow-sm peer-checked:text-primary text-on-surface-variant transition-all flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">payments</span>
                  Issue Fine
                </div>
              </label>
            </div>

            {/* Status Alert Toast */}
            {status && (
              <div className={`p-4 mb-4 rounded-md flex items-start gap-3 border text-xs font-semibold ${
                status.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                  : status.type === 'error'
                    ? 'bg-red-50 border-red-100 text-red-700'
                    : 'bg-blue-50 border-blue-100 text-blue-700'
              }`}>
                <span className="material-symbols-outlined text-[18px]">
                  {status.type === 'success' ? 'check_circle' : status.type === 'error' ? 'error' : 'sync'}
                </span>
                <div className="flex-1">
                  <p className="m-0 leading-relaxed">{status.text}</p>
                </div>
                <button 
                  onClick={() => setStatus(null)} 
                  className="text-slate-400 hover:text-slate-650 cursor-pointer self-start border-none bg-transparent flex items-center"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}
            {/* Issue Tab Content */}
            {mode === 'issue' && (
              <form onSubmit={handleIssueSubmit} className="space-y-6">
                {/* STUDENT INFORMATION */}
                <div>
                  <h4 className="font-label-md text-[10px] text-primary uppercase tracking-wider mb-3 border-b border-surface-variant pb-1.5">STUDENT INFORMATION</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    <div className="space-y-1.5 relative">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Student Name</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">person</span>
                        <div className="relative flex-1">
                          <input 
                            className="w-full pr-8 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                            placeholder="Enter Student Name..." 
                            type="text"
                            value={studentName}
                            onChange={(e) => {
                              setStudentName(e.target.value);
                              setShowStudentDropdown(true);
                            }}
                            onFocus={() => setShowStudentDropdown(true)}
                            onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                          />
                          {isStudentActive && (
                            <button 
                              type="button" 
                              onClick={handleClearStudent} 
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-700 cursor-pointer border-none bg-transparent flex items-center"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Autocomplete Dropdown */}
                      {showStudentDropdown && studentName && (
                        <div className="absolute left-0 right-0 z-50 bg-surface-container-lowest border border-outline-variant rounded-md max-h-48 overflow-y-auto mt-1 shadow-lg divide-y divide-surface-variant">
                          {filteredStudents.length === 0 ? (
                            <div className="p-3 text-xs text-on-surface-variant text-center">No matching students found</div>
                          ) : (
                            filteredStudents.map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onMouseDown={() => handleStudentSelect(s)}
                                className="w-full text-left p-2.5 text-[12px] hover:bg-surface-container-low text-on-surface flex justify-between items-center cursor-pointer border-none bg-transparent"
                              >
                                <span className="font-semibold">{s.name}</span>
                                <span className="font-mono text-[10px] text-on-surface-variant">{s.id}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Class Name / Course</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">school</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="Enter Class Name / Course..." 
                          type="text"
                          value={classGrade}
                          onChange={(e) => setClassGrade(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Section</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">tag</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="Enter Section..." 
                          type="text"
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Student ID / Roll Number</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">tag</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="Enter Student ID / Roll Number..." 
                          type="text"
                          value={studentRollNumber}
                          onChange={(e) => setStudentRollNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Email Address</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">mail</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="Enter Email Address..." 
                          type="email"
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Contact Phone</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">phone</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="Enter Contact Phone..." 
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* BOOK INFORMATION */}
                <div>
                  <h4 className="font-label-md text-[10px] text-primary uppercase tracking-wider mb-3 border-b border-surface-variant pb-1.5">BOOK INFORMATION</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    <div className="space-y-1.5 relative">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Search Book (Optional)</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">menu_book</span>
                        <div className="relative flex-1">
                          <input 
                            className="w-full pr-8 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                            placeholder="Type book title or ISBN..." 
                            type="text"
                            value={bookSearch}
                            onChange={(e) => {
                              setBookSearch(e.target.value);
                              setShowBookDropdown(true);
                            }}
                            onFocus={() => setShowBookDropdown(true)}
                            onBlur={() => setTimeout(() => setShowBookDropdown(false), 200)}
                          />
                          {selectedBook && (
                            <button 
                              type="button" 
                              onClick={handleClearBook} 
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-700 cursor-pointer border-none bg-transparent flex items-center"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Autocomplete book list */}
                      {showBookDropdown && bookSearch && (
                        <div className="absolute left-0 right-0 z-50 bg-surface-container-lowest border border-outline-variant rounded-md max-h-48 overflow-y-auto mt-1 shadow-lg divide-y divide-surface-variant">
                          {filteredBooks.length === 0 ? (
                            <div className="p-3 text-xs text-on-surface-variant text-center">No matching books found</div>
                          ) : (
                            filteredBooks.map(b => {
                              const avail = b.available_copies ?? 1;
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onMouseDown={() => handleBookSelect(b)}
                                  disabled={avail === 0}
                                  className="w-full text-left p-2.5 text-[12px] hover:bg-surface-container-low text-on-surface flex justify-between items-center cursor-pointer border-none bg-transparent disabled:opacity-50"
                                >
                                  <span className="font-semibold truncate max-w-[200px]">{b.title}</span>
                                  <span className="font-mono text-[10px] text-on-surface-variant">{avail} available {avail === 0 && '(OUT)'}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Accession Number / Copy ID</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">tag</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="Enter Accession Number..." 
                          type="text"
                          value={accessionNumber}
                          onChange={(e) => setAccessionNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Book Title</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">menu_book</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="Enter Book Title..." 
                          type="text"
                          value={bookTitle}
                          onChange={(e) => setBookTitle(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Edition / Publication Year</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">calendar_today</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="Enter Edition / Year..." 
                          type="text"
                          value={editionYear}
                          onChange={(e) => setEditionYear(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Author</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">person</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="Enter Author..." 
                          type="text"
                          value={bookAuthor}
                          onChange={(e) => setBookAuthor(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Category</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">category</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="Enter Category..." 
                          type="text"
                          value={bookCategory}
                          onChange={(e) => setBookCategory(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Shelf / Rack Location (Read-only)</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">shelves</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on copy" 
                          readonly 
                          type="text"
                          value={shelfLocation}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Physical Condition</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">build</span>
                        <div className="relative flex-1">
                          <select 
                            value={physicalCondition}
                            onChange={(e) => setPhysicalCondition(e.target.value)}
                            className="w-full pr-8 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="Excellent">Excellent</option>
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Poor">Poor</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[16px]">expand_more</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* LENDING & DATES */}
                <div>
                  <h4 className="font-label-md text-[10px] text-primary uppercase tracking-wider mb-3 border-b border-surface-variant pb-1.5">LENDING & DATES</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Lending Period (Days)</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">calendar_today</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Issue Date</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">calendar_month</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer" 
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Expected Due Date</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">event</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer" 
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => { handleClearStudent(); handleClearBook(); setStatus(null); }}
                    className="px-4 py-1.5 border border-outline-variant rounded-md font-label-md text-[11px] text-on-surface-variant hover:bg-surface-container-low transition-all border-none cursor-pointer"
                  >
                    Clear Form
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !studentName.trim() || !bookTitle.trim()}
                    className="bg-primary text-on-primary px-4 py-1.5 rounded-md font-label-md text-[11px] hover:bg-primary-container shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed border-none font-semibold cursor-pointer"
                  >
                    Process Issue
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </form>
            )}

            {/* Return Tab Content */}
            {mode === 'return' && (
              <form onSubmit={handleReturnSubmit} className="space-y-6">
                {/* ASSET TRANSACTION */}
                <div className="space-y-3">
                  <h4 className="font-label-md text-[10px] text-primary uppercase tracking-wider mb-2 border-b border-surface-variant pb-1.5 font-bold">Asset Transaction</h4>
                  
                  <div className="space-y-1.5 relative">
                    <label className="font-label-md text-[11px] text-on-surface-variant block">Transaction ID</label>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-outline text-[18px] shrink-0">tag</span>
                      <div className="relative flex-1">
                        <input 
                          className="w-full pr-8 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono" 
                          placeholder="Type Transaction ID (e.g., TRX-0004 or 4)..." 
                          type="text"
                          value={txSearch}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTxSearch(val);
                            
                            // Auto-detect transaction ID
                            const match = val.trim().toUpperCase().match(/^(?:TRX-)?0*(\d+)$/);
                            if (match) {
                              const id = parseInt(match[1], 10);
                              const found = activeTransactions.find(t => t.transaction_id === id || t.id === id);
                              if (found) {
                                setSelectedTransaction(found);
                              } else {
                                setSelectedTransaction(null);
                              }
                            } else {
                              setSelectedTransaction(null);
                            }
                            setShowTxDropdown(true);
                          }}
                          onFocus={() => setShowTxDropdown(true)}
                          onBlur={() => setTimeout(() => setShowTxDropdown(false), 200)}
                        />
                        {selectedTransaction && (
                          <button 
                            type="button" 
                            onClick={handleClearTransaction} 
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-700 cursor-pointer border-none bg-transparent flex items-center"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showTxDropdown && txSearch && (
                      <div className="absolute left-0 right-0 z-50 bg-surface-container-lowest border border-outline-variant rounded-md max-h-48 overflow-y-auto mt-1 shadow-lg divide-y divide-surface-variant">
                        {filteredTransactions.length === 0 ? (
                          <div className="p-3 text-xs text-on-surface-variant text-center">No active checkouts match your query</div>
                        ) : (
                          filteredTransactions.map(tx => (
                            <button
                              key={tx.id || tx.transaction_id}
                              type="button"
                              onMouseDown={() => handleTxSelect(tx)}
                              className="w-full text-left p-2.5 text-[12px] hover:bg-surface-container-low text-on-surface flex justify-between items-center cursor-pointer border-none bg-transparent"
                            >
                              <span className="font-semibold">{String(tx.transaction_id || tx.id).toUpperCase().startsWith('TRX-') ? (tx.transaction_id || tx.id) : `TRX-${String(tx.transaction_id || tx.id).padStart(4, '0')}`}</span>
                              <span className="text-on-surface-variant truncate font-semibold max-w-[150px]">{tx.student_name}</span>
                              <span className="truncate text-on-surface-variant max-w-[150px]">{tx.title}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* STUDENT INFORMATION */}
                <div>
                  <h4 className="font-label-md text-[10px] text-primary uppercase tracking-wider mb-3 border-b border-surface-variant pb-1.5">STUDENT INFORMATION</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Student Name</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">person</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? selectedTransaction.student_name : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Class Name / Course</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">school</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? (fullStudent?.class_grade || 'Grade 10') : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Section</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">tag</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? (fullStudent?.section || 'A') : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Student ID / Roll Number</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">tag</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? selectedTransaction.student_id : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Email Address</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">mail</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="email"
                          value={selectedTransaction ? (fullStudent?.email || `${selectedTransaction.student_name.toLowerCase().replace(/\s+/g, '')}@library.edu`) : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Contact Phone</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">phone</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="tel"
                          value={selectedTransaction ? (fullStudent?.phone || fullStudent?.contact || '9848022338') : ''}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* BOOK INFORMATION */}
                <div>
                  <h4 className="font-label-md text-[10px] text-primary uppercase tracking-wider mb-3 border-b border-surface-variant pb-1.5">BOOK INFORMATION</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Search Book (Optional)</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">menu_book</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? `${selectedTransaction.title || selectedTransaction.book_title} (ISBN: ${fullBook?.isbn || ''})` : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Accession Number / Copy ID</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">tag</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? (fullBook?.isbn || '') : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Book Title</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">menu_book</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? (selectedTransaction.title || selectedTransaction.book_title) : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Edition / Publication Year</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">calendar_today</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? (fullBook?.edition || '2023 (1st Edition)') : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Author</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">person</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? (fullBook?.author || '') : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Category</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">category</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? (fullBook?.category || 'General') : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Shelf / Rack Location (Read-only)</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">shelves</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? (fullBook?.shelf || fullBook?.shelf_location || `Rack ${String.fromCharCode(65 + (fullBook?.id % 6))}, Shelf ${(fullBook?.id % 4) + 1}`) : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Physical Condition</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">build</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          placeholder="Auto-filled based on transaction" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? (fullBook?.condition || 'Excellent') : ''}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* LENDING & DATES */}
                <div>
                  <h4 className="font-label-md text-[10px] text-primary uppercase tracking-wider mb-3 border-b border-surface-variant pb-1.5">LENDING & DATES</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Lending Period (Days)</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">calendar_today</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? Math.round((new Date(selectedTransaction.expected_return_date || selectedTransaction.due_date) - new Date(selectedTransaction.issue_date)) / (1000 * 60 * 60 * 24)) : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Issue Date</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">calendar_month</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? selectedTransaction.issue_date : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Expected Due Date</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">event</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface-variant outline-none cursor-not-allowed" 
                          readOnly 
                          type="text"
                          value={selectedTransaction ? (selectedTransaction.expected_return_date || selectedTransaction.due_date) : ''}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* RETURN DETAILS */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-label-md text-[10px] text-primary uppercase tracking-wider mb-2 border-b border-surface-variant pb-1.5 font-bold">Return Action & Remarks</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Actual Return Date</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">calendar_month</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer" 
                          type="date"
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Current Book Image</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">photo_camera</span>
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setReturnImage(reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                            id="return-book-image-file"
                          />
                          <label
                            htmlFor="return-book-image-file"
                            className="h-9 px-3 bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded-md font-label-md text-[11px] flex items-center gap-1.5 cursor-pointer text-on-surface"
                          >
                            <span className="material-symbols-outlined text-[16px]">upload_file</span>
                            Upload Image
                          </label>
                          {returnImage && (
                            <div className="relative w-10 h-10 border border-surface-variant rounded overflow-hidden">
                              <img src={returnImage} alt="Return Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setReturnImage(null)}
                                className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl border-none cursor-pointer flex items-center"
                              >
                                <span className="material-symbols-outlined text-[10px]">close</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Remarks / Condition Notes</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">notes</span>
                        <input
                          type="text"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          className="flex-1 bg-surface border border-outline-variant rounded-md px-3 py-1.5 font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                          placeholder="e.g., slight wear on cover, pages intact..."
                        />
                      </div>
                    </div>

                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => { handleClearTransaction(); setStatus(null); }}
                    className="px-4 py-1.5 border border-outline-variant rounded-md font-label-md text-[11px] text-on-surface-variant hover:bg-surface-container-low transition-all border-none cursor-pointer"
                  >
                    Clear Form
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !selectedTransaction}
                    className="bg-primary text-on-primary px-4 py-1.5 rounded-md font-label-md text-[11px] hover:bg-primary-container shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed border-none font-semibold cursor-pointer"
                  >
                    Process Return
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </form>
            )}

            {/* Fine Tab Content */}
            {mode === 'fine' && (
              <form onSubmit={handleFineSubmit} className="space-y-6">
                <div>
                  <h4 className="font-label-md text-[10px] text-primary uppercase tracking-wider mb-3 border-b border-surface-variant pb-1.5">FINE DETAILS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {/* Student Search */}
                    <div className="space-y-1.5 relative">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Student Search</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">person_search</span>
                        <div className="relative flex-1">
                          <input 
                            className="w-full pr-8 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                            placeholder="Search student by name or ID..." 
                            type="text"
                            value={fineStudentSearch}
                            onChange={(e) => {
                              setFineStudentSearch(e.target.value);
                              setShowFineStudentDropdown(true);
                            }}
                            onFocus={() => setShowFineStudentDropdown(true)}
                            onBlur={() => setTimeout(() => setShowFineStudentDropdown(false), 200)}
                          />
                          {selectedStudent && (
                            <button 
                              type="button" 
                              onClick={() => {
                                setSelectedStudent(null);
                                setFineStudentSearch('');
                              }} 
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-700 cursor-pointer border-none bg-transparent flex items-center"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Autocomplete Dropdown */}
                      {showFineStudentDropdown && fineStudentSearch && (
                        <div className="absolute left-0 right-0 z-50 bg-surface-container-lowest border border-outline-variant rounded-md max-h-48 overflow-y-auto mt-1 shadow-lg divide-y divide-surface-variant">
                          {filteredFineStudents.length === 0 ? (
                            <div className="p-3 text-xs text-on-surface-variant text-center">No matching students found</div>
                          ) : (
                            filteredFineStudents.map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onMouseDown={() => handleFineStudentSelect(s)}
                                className="w-full text-left p-2.5 text-[12px] hover:bg-surface-container-low text-on-surface flex justify-between items-center cursor-pointer border-none bg-transparent"
                              >
                                <span className="font-semibold">{s.name}</span>
                                <span className="font-mono text-[10px] text-on-surface-variant">{s.id}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Associated Transaction */}
                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Associated Transaction (Optional)</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">tag</span>
                        <div className="relative flex-1">
                          <select 
                            value={selectedTxId}
                            onChange={(e) => setSelectedTxId(e.target.value)}
                            disabled={!selectedStudent}
                            className="w-full pr-6 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-on-surface"
                          >
                            <option value="">-- Choose Transaction (Default: Latest) --</option>
                            {studentTransactions.map(tx => (
                              <option key={tx.transaction_id || tx.id} value={tx.transaction_id || tx.id}>
                                {String(tx.transaction_id || tx.id).toUpperCase().startsWith('TRX-') ? (tx.transaction_id || tx.id) : `TRX-${String(tx.transaction_id || tx.id).padStart(4, '0')}`} - {tx.book_title || tx.title} (Issued: {tx.issue_date})
                              </option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[16px]">expand_more</span>
                        </div>
                      </div>
                    </div>

                    {/* Fine Category */}
                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Fine Category</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">category</span>
                        <div className="relative flex-1">
                          <select 
                            value={fineCategory}
                            onChange={(e) => setFineCategory(e.target.value)}
                            className="w-full pr-6 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer text-on-surface"
                          >
                            <option>Overdue</option>
                            <option>Damaged Book</option>
                            <option>Lost Book</option>
                            <option>Other</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[16px]">expand_more</span>
                        </div>
                      </div>
                    </div>

                    {/* Fine Amount */}
                    <div className="space-y-1.5">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Fine Amount (₹)</label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">currency_rupee</span>
                        <input 
                          className="w-full pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                          placeholder="₹ 0.00" 
                          step="0.01" 
                          type="number"
                          value={fineAmount}
                          onChange={(e) => setFineAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Notes / Description */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-label-md text-[11px] text-on-surface-variant block">Notes / Description</label>
                      <textarea 
                        className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all min-h-[80px]" 
                        placeholder="Provide details about the fine..."
                        value={fineNotes}
                        onChange={(e) => setFineNotes(e.target.value)}
                      ></textarea>
                    </div>

                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setFineAmount('');
                      setFineNotes('');
                      setFineStudentSearch('');
                      setSelectedStudent(null);
                      setSelectedTxId('');
                      setStatus(null);
                    }}
                    className="px-4 py-1.5 border border-outline-variant rounded-md font-label-md text-[11px] text-on-surface-variant hover:bg-surface-container-low transition-all border-none cursor-pointer"
                  >
                    Clear Form
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !selectedStudent || !fineAmount}
                    className="bg-primary text-on-primary px-4 py-1.5 rounded-md font-label-md text-[11px] hover:bg-primary-container shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed border-none font-semibold cursor-pointer"
                  >
                    Apply Fine
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  </button>
                </div>
              </form>
            )}
      </div>
    </div>
  );
}
