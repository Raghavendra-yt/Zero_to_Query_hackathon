import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { getBooks, addBook, updateBook, deleteBook } from '../lib/api';
import { MorphingSquare } from './ui/morphing-square';

export default function BookCatalog({ defaultCategory = '', addBookTrigger = 0, searchFilter = '' }) {
  const shouldReduceMotion = useReducedMotion();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Search and Filter states
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  
  // Selected book for details, edit, delete
  const [selectedBook, setSelectedBook] = useState(null);
  const [message, setMessage] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Computer Science',
    total_copies: 1,
    imageUrl: '',
    shelf: ''
  });
  const [newCategory, setNewCategory] = useState('');

  // Sorting
  const [sortKey, setSortKey] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const categories = [
    'Computer Science',
    'Physics',
    'Mathematics',
    'Chemistry',
    'Fiction',
    'History',
    'Literature'
  ];

  // Map defaults if they change from props
  useEffect(() => {
    if (defaultCategory) {
      setCategory(defaultCategory);
      setCurrentPage(1);
    }
  }, [defaultCategory]);

  // Sync global search filter from top navigation
  useEffect(() => {
    if (searchFilter !== undefined) {
      setSearchVal(searchFilter);
      setSearch(searchFilter);
      setCurrentPage(1);
    }
  }, [searchFilter]);

  // Open add modal when global Add Book trigger fires
  useEffect(() => {
    if (addBookTrigger > 0) {
      triggerAddOpen();
    }
  }, [addBookTrigger]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const data = await getBooks({ search, category });
      setBooks(data);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to fetch books.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    setCurrentPage(1);
  }, [search, category]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setSearch(searchVal);
  };

  // Add Book Action
  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.category === 'Other (Add New)' && newCategory.trim()) {
        payload.category = newCategory.trim();
      }
      payload.available_copies = payload.total_copies; // Initial setup
      await addBook(payload);
      setMessage({ type: 'success', text: 'Book added to catalog successfully!' });
      resetForm();
      setShowAddModal(false);
      fetchBooks();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to add book.' });
    }
  };

  // Edit Book Action
  const handleEditBook = async (e) => {
    e.preventDefault();
    if (!selectedBook) return;
    try {
      const payload = { ...formData };
      if (payload.category === 'Other (Add New)' && newCategory.trim()) {
        payload.category = newCategory.trim();
      }
      // Keep availability constraints
      const difference = payload.total_copies - selectedBook.total_copies;
      payload.available_copies = Math.max(0, (selectedBook.available_copies || 0) + difference);

      await updateBook(selectedBook.id, payload);
      setMessage({ type: 'success', text: 'Book modified successfully!' });
      resetForm();
      setShowEditModal(false);
      fetchBooks();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to modify book.' });
    }
  };

  // Delete Book Action
  const handleDeleteBook = async () => {
    if (!selectedBook) return;
    try {
      await deleteBook(selectedBook.id);
      setMessage({ type: 'success', text: 'Book deleted from catalog successfully.' });
      setShowDeleteConfirm(false);
      setSelectedBook(null);
      fetchBooks();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete book.' });
      setShowDeleteConfirm(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: 'Computer Science',
      total_copies: 1,
      imageUrl: '',
      shelf: ''
    });
    setNewCategory('');
    setSelectedBook(null);
  };

  const toggleCardMenu = (e, bookId) => {
    e.stopPropagation();
    setActiveMenuId(prev => prev === bookId ? null : bookId);
  };

  const closeCardMenu = () => {
    setActiveMenuId(null);
  };

  useEffect(() => {
    const handleWindowClick = () => {
      closeCardMenu();
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const triggerRenameOpen = (e, book) => {
    if (e) e.stopPropagation();
    setSelectedBook(book);
    setRenameTitle(book.title);
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBook || !renameTitle.trim()) return;
    try {
      const payload = {
        title: renameTitle.trim(),
        author: selectedBook.author,
        isbn: selectedBook.isbn,
        category: selectedBook.category,
        total_copies: selectedBook.total_copies,
        available_copies: selectedBook.available_copies,
        imageUrl: selectedBook.imageUrl,
        shelf: selectedBook.shelf
      };
      await updateBook(selectedBook.id, payload);
      setMessage({ type: 'success', text: 'Book renamed successfully!' });
      setShowRenameModal(false);
      fetchBooks();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to rename book.' });
    }
  };

  const triggerAddOpen = () => {
    resetForm();
    setShowAddModal(true);
  };

  const triggerEditOpen = (e, book) => {
    if (e) e.stopPropagation();
    setSelectedBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      total_copies: book.total_copies,
      imageUrl: book.imageUrl || '',
      shelf: book.shelf || ''
    });
    setShowEditModal(true);
  };

  const triggerViewOpen = (book) => {
    setSelectedBook(book);
    setShowViewModal(true);
  };

  const triggerDeleteConfirm = (e, book) => {
    if (e) e.stopPropagation();
    setSelectedBook(book);
    setShowDeleteConfirm(true);
  };

  const getBookCoverUrl = (title) => {
    const t = title.toLowerCase();
    if (t.includes('everyday things') || t.includes('design')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqQueuFdFlvUZAfl0PqxpbLjgd_Bthix0ZvECz1R9NQPlajW9D2Fiydr6OtkwxSCJDXEp7L2f96ySWpECMIDceRnxmCXD28lx9takB2N-YiyoxK-lGzI29qVS7N_T7iS12PfXaFzxABQLLv1vOHNG6RpKo874ywn8IM3m115RSCA03BDgRGYPolDzpu3qMEQssR4frm3TRHmRz1-MpswoiJRlRguDSZkm3Z0S7Smz0BEtDADHlK13VzrNfMPZKve9ULMv6nWBiAMWK';
    }
    if (t.includes('refactoring')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbNIaMDFrpHUPVS7MDVIbojDTqon7bKp1fmk9DbnmyGx8bhv4VuIgQs06yoRaMo4G3FPMK6BoZPDXHzaZYPd76i7cfrdqnPjbbsunPOxDscckrxDd52w_Mfz_TVJMD87cCoyWTqoz6XjW7UBDKCuET5V771aDwn0wUky33dDyLVAwB2mVYUt1zRCo5GlP-tcPJ7NdFs-_PW5IYh8kMVeaRMXcRzyL9844MIIn4qr9LPIaqW344djhitTPOqUbeiF2aLn9Fr2C6cTVc';
    }
    if (t.includes('thinking') || t.includes('slow')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuAj9uzaXFCOBdZPyx4HpEIs-UiA92jYuIOJEtb2NvjyLt1lrRtYEBJf3MALJHB0gZjmSRs_O357ycbwIHeG4gFT14Md1NvC8SKZL6W6xFKNRIKNXSjWpSOf6seN0ILFI-NNee0cVjCbdTz07hAaI80Yy2W83XlVFGRI4TPZJIShWZwIapoVUU1XgYKgCg2zQYTyA6DLRaSXJo_Cp9cCGiGOVuAPbde4fLBo4LfzX3vt8r8Bk5881wD7EbWyJqETOLAjoGPhS_0ghOCt';
    }
    return null;
  };

  const getBookStatus = (book) => {
    if (book.available_copies === 0) {
      return { 
        label: `Loaned Out - Due ${book.due_date || '10/24'}`, 
        style: 'bg-tertiary-fixed text-tertiary border border-tertiary/20',
        icon: 'schedule'
      };
    }
    return { 
      label: `Available - ${book.shelf || 'Shelf 4B'}`, 
      style: 'bg-secondary-container text-secondary border border-secondary/20',
      icon: 'check_circle'
    };
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Filtering: "Show Available Only"
  const filteredBooks = books.filter(book => {
    if (showAvailableOnly && book.available_copies === 0) return false;
    return true;
  });

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === 'copies') {
      valA = a.available_copies;
      valB = b.available_copies;
    }

    if (typeof valA === 'string') {
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Pagination Logic
  const totalBooks = sortedBooks.length;
  const totalPages = Math.ceil(totalBooks / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedBooks = sortedBooks.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* 1. Page Title Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-headline-md text-xl text-primary m-0">Library Book Catalog</h2>
        </div>
        <button
          onClick={triggerAddOpen}
          className="h-9 bg-primary text-on-primary px-4 rounded-md font-label-md text-[12px] hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm flex items-center gap-1 border-none cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add New Book
        </button>
      </div>

      {/* 2. Advanced Catalog Search Section */}
      <section className="bg-surface-container-lowest border border-surface-variant rounded-md p-4 shadow-sm relative overflow-hidden group">
        <h2 className="font-headline-sm text-[16px] text-primary mb-4 flex items-center gap-1.5 m-0">
          <span className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>manage_search</span>
          Advanced Books Catalog Search
        </h2>
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-end mt-4">
          <div className="flex-1 w-full">
            <label className="block font-label-md text-[11px] text-on-surface-variant mb-1 uppercase tracking-wider">Search Query</label>
            <input 
              className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors h-9 focus:outline-none" 
              placeholder="Book Title, Author, or ISBN..." 
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <label className="block font-label-md text-[11px] text-on-surface-variant mb-1 uppercase tracking-wider">Category</label>
            <select 
              className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer h-9 focus:outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 h-9 px-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                className="sr-only peer" 
                type="checkbox" 
                checked={showAvailableOnly}
                onChange={(e) => setShowAvailableOnly(e.target.checked)}
              />
              <div className="w-9 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:border-surface-variant after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-2 font-body-sm text-[12px] text-on-surface">Show Available Only</span>
            </label>
          </div>
          <button 
            type="submit"
            className="h-9 bg-primary text-on-primary px-4 rounded-md font-label-md text-[12px] hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm flex items-center gap-1 border-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
            Search
          </button>
        </form>
      </section>

      {/* Message Banner */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3.5 rounded-md flex items-center justify-between text-xs font-semibold ${
              message.type === 'success' 
                ? 'bg-emerald-50 border border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' 
                : 'bg-red-50 border border-red-100 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">{message.type === 'success' ? 'check_circle' : 'error'}</span>
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="cursor-pointer bg-transparent border-none p-0 flex items-center justify-center text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Search Results Grid & List View Toggle */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-sm text-[16px] text-primary flex items-center gap-1.5 m-0">
            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>view_cozy</span>
            Search Results <span className="text-on-surface-variant text-[12px] font-normal ml-1">({totalBooks} found)</span>
          </h3>
          <div className="flex gap-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 border rounded-md shadow-sm transition-colors cursor-pointer flex items-center justify-center ${
                viewMode === 'grid' 
                  ? 'border-surface-variant bg-surface-container-lowest text-primary' 
                  : 'border-transparent text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 border rounded-md shadow-sm transition-colors cursor-pointer flex items-center justify-center ${
                viewMode === 'list' 
                  ? 'border-surface-variant bg-surface-container-lowest text-primary' 
                  : 'border-transparent text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <MorphingSquare
              message="Updating catalog assets..."
              className="bg-primary"
            />
          </div>
        ) : totalBooks === 0 ? (
          <div className="bg-surface-container-lowest border border-surface-variant rounded-md p-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl opacity-40 mb-2">menu_book</span>
            <p className="text-sm font-semibold">No books match your search queries.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:grid-cols-5 gap-4">
            {paginatedBooks.map((book) => {
              const coverUrl = book.imageUrl || getBookCoverUrl(book.title);
              const statusInfo = getBookStatus(book);
              return (
                <article 
                  key={book.id}
                  onClick={() => triggerViewOpen(book)}
                  className="bg-surface-container-lowest border border-surface-variant rounded-md shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group cursor-pointer relative h-[360px]"
                >
                  <div className="aspect-[2/3] bg-surface-variant relative overflow-hidden flex-1">
                    {coverUrl ? (
                      <img 
                        alt="Book Cover" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        src={coverUrl}
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                        <span className="material-symbols-outlined text-[32px] opacity-50">menu_book</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-1 shrink-0 bg-surface-container-lowest border-t border-surface-variant/30">
                    <h4 className="font-headline-sm text-[13px] font-bold text-on-surface line-clamp-1 m-0" title={book.title}>
                      {book.title}
                    </h4>
                    <p className="font-body-sm text-[11px] text-on-surface-variant m-0 mb-1">{book.author}</p>
                    <p className="font-mono-sm text-[10px] text-outline m-0 mb-3">ISBN: {book.isbn}</p>
                    
                    <div className="mt-auto flex items-center justify-between relative">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-md text-[10px] ${statusInfo.style}`}>
                        <span className="material-symbols-outlined text-[12px]">{statusInfo.icon}</span>
                        {statusInfo.label}
                      </span>
                      
                      {/* Three Dots Button for Card Menu */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => toggleCardMenu(e, book.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant border-none bg-transparent cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">more_vert</span>
                        </button>
                        
                        {activeMenuId === book.id && (
                          <div className="absolute right-0 bottom-8 z-30 bg-white border border-outline-variant rounded-md shadow-lg py-1 w-28 text-left">
                            <button
                              onClick={(e) => { triggerEditOpen(e, book); closeCardMenu(); }}
                              className="w-full px-3 py-1.5 text-[11px] hover:bg-surface-container text-on-surface border-none bg-transparent text-left cursor-pointer flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                              Edit
                            </button>
                            <button
                              onClick={(e) => { triggerRenameOpen(e, book); closeCardMenu(); }}
                              className="w-full px-3 py-1.5 text-[11px] hover:bg-surface-container text-on-surface border-none bg-transparent text-left cursor-pointer flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[14px]">drive_file_rename_outline</span>
                              Rename
                            </button>
                            <button
                              onClick={(e) => { triggerDeleteConfirm(e, book); closeCardMenu(); }}
                              className="w-full px-3 py-1.5 text-[11px] hover:bg-rose-50 text-rose-600 border-none bg-transparent text-left cursor-pointer flex items-center gap-1.5 font-semibold"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW TABLE STYLE */
          <div className="bg-surface-container-lowest border border-surface-variant rounded-md shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high border-b border-surface-variant font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">
                    <th className="py-2.5 px-3.5 w-16">Book Image</th>
                    <th className="py-2.5 px-3.5">Book Title</th>
                    <th className="py-2.5 px-3.5">Author</th>
                    <th className="py-2.5 px-3.5">ISBN</th>
                    <th className="py-2.5 px-3.5">Category</th>
                    <th className="py-2.5 px-3.5">Stock Status</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant font-body-sm text-[12px] text-on-surface">
                  {paginatedBooks.map((book) => {
                    const statusInfo = getBookStatus(book);
                    const coverUrl = book.imageUrl || getBookCoverUrl(book.title);
                    return (
                      <tr 
                        key={book.id} 
                        onClick={() => triggerViewOpen(book)}
                        className="hover:bg-surface-container-low transition-colors cursor-pointer group"
                      >
                        <td className="py-2 px-3.5">
                          {coverUrl ? (
                            <img 
                              alt="Book Cover" 
                              className="w-10 h-12 object-cover rounded shadow-sm group-hover:scale-105 transition-transform" 
                              src={coverUrl}
                            />
                          ) : (
                            <div className="w-10 h-12 bg-secondary-container flex items-center justify-center text-on-secondary-container rounded">
                              <span className="material-symbols-outlined text-[18px] opacity-50">menu_book</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 font-semibold text-primary">{book.title}</td>
                        <td className="py-2.5 px-3.5">{book.author}</td>
                        <td className="py-2.5 px-3.5 font-mono-sm text-[10px] text-on-surface-variant">{book.isbn}</td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-surface-container border border-outline-variant/30 text-on-surface-variant font-semibold">
                            {book.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-label-md text-[10px] ${statusInfo.style}`}>
                            <span className="material-symbols-outlined text-[12px]">{statusInfo.icon}</span>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          {/* Three Dots Button for List Row Menu */}
                          <div className="inline-block relative">
                            <button
                              onClick={(e) => toggleCardMenu(e, `list-${book.id}`)}
                              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant border-none bg-transparent cursor-pointer ml-auto"
                            >
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>
                            
                            {activeMenuId === `list-${book.id}` && (
                              <div className="absolute right-0 top-8 z-30 bg-white border border-outline-variant rounded-md shadow-lg py-1 w-28 text-left">
                                <button
                                  onClick={(e) => { triggerEditOpen(e, book); closeCardMenu(); }}
                                  className="w-full px-3 py-1.5 text-[11px] hover:bg-surface-container text-on-surface border-none bg-transparent text-left cursor-pointer flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => { triggerRenameOpen(e, book); closeCardMenu(); }}
                                  className="w-full px-3 py-1.5 text-[11px] hover:bg-surface-container text-on-surface border-none bg-transparent text-left cursor-pointer flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[14px]">drive_file_rename_outline</span>
                                  Rename
                                </button>
                                <button
                                  onClick={(e) => { triggerDeleteConfirm(e, book); closeCardMenu(); }}
                                  className="w-full px-3 py-1.5 text-[11px] hover:bg-rose-50 text-rose-600 border-none bg-transparent text-left cursor-pointer flex items-center gap-1.5 font-semibold"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Pagination & Page Size Selector */}
        {totalBooks > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container-lowest border border-surface-variant rounded-md p-3.5 shadow-sm">
            <div className="flex items-center gap-2 font-body-sm text-[12px] text-on-surface-variant shrink-0 whitespace-nowrap">
              <span>Books per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="pagination-select bg-surface border border-surface-variant rounded-md py-1 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer text-[12px] h-8 font-medium"
              >
                <option className="bg-white text-slate-800" value="5">5</option>
                <option className="bg-white text-slate-800" value="10">10</option>
                <option className="bg-white text-slate-800" value="20">20</option>
                <option className="bg-white text-slate-800" value="50">50</option>
              </select>
            </div>
            
            <nav className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded transition-colors disabled:opacity-50 border-none bg-transparent flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-7 h-7 flex items-center justify-center font-label-md text-[11px] rounded transition-colors border-none cursor-pointer ${
                    currentPage === idx + 1
                      ? 'bg-primary text-on-primary font-bold'
                      : 'text-on-surface hover:bg-surface-container bg-transparent'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded transition-colors disabled:opacity-50 border-none bg-transparent flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </nav>
          </div>
        )}
      </section>

      {/* ======================================= */}
      {/* MODALS SECTION */}
      {/* ======================================= */}

      <AnimatePresence>
        {/* 1. ADD BOOK MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-lg p-6 relative z-10 border border-surface-variant shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-primary m-0">Add New Catalog Book</h3>
                <button onClick={() => setShowAddModal(false)} className="text-on-surface-variant hover:text-primary cursor-pointer bg-transparent border-none flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleAddBook} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Book Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="Enter book title"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Author Name</label>
                  <input
                    type="text"
                    name="author"
                    required
                    value={formData.author}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="Enter author name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">ISBN Number</label>
                    <input
                      type="text"
                      name="isbn"
                      required
                      value={formData.isbn}
                      onChange={handleInputChange}
                      className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                      placeholder="e.g., 978013235"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Total Copies</label>
                    <input
                      type="number"
                      name="total_copies"
                      required
                      min="1"
                      value={formData.total_copies}
                      onChange={handleInputChange}
                      className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Book Image (Upload or URL)</label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData(prev => ({ ...prev, imageUrl: reader.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="add-book-image-file"
                    />
                    <label
                      htmlFor="add-book-image-file"
                      className="h-9 px-3 bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded-md font-label-md text-[11px] flex items-center gap-1.5 cursor-pointer text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      Upload File
                    </label>
                    <input
                      type="text"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleInputChange}
                      className="flex-1 bg-surface border border-surface-variant rounded-md px-3 py-1.5 font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                      placeholder="Or paste image URL..."
                    />
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-2 relative w-16 h-20 border border-surface-variant rounded overflow-hidden">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl border-none cursor-pointer flex items-center"
                      >
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Shelf / Location</label>
                  <input
                    type="text"
                    name="shelf"
                    value={formData.shelf}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="e.g., Shelf 4B, Rack 2"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Other (Add New)">Other (Add New)...</option>
                  </select>
                  {formData.category === 'Other (Add New)' && (
                    <input
                      type="text"
                      placeholder="Enter new category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 mt-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                      required
                    />
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container rounded-md font-label-md text-[12px] transition-colors border-none cursor-pointer mt-2"
                >
                  Save Book to Library
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. EDIT BOOK MODAL */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-lg p-6 relative z-10 border border-surface-variant shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-primary m-0">Edit Catalog Book</h3>
                <button onClick={() => setShowEditModal(false)} className="text-on-surface-variant hover:text-primary cursor-pointer bg-transparent border-none flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleEditBook} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Book Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Author Name</label>
                  <input
                    type="text"
                    name="author"
                    required
                    value={formData.author}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">ISBN Number</label>
                    <input
                      type="text"
                      name="isbn"
                      required
                      value={formData.isbn}
                      onChange={handleInputChange}
                      className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Total Copies</label>
                    <input
                      type="number"
                      name="total_copies"
                      required
                      min="1"
                      value={formData.total_copies}
                      onChange={handleInputChange}
                      className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Book Image (Upload or URL)</label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData(prev => ({ ...prev, imageUrl: reader.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="edit-book-image-file"
                    />
                    <label
                      htmlFor="edit-book-image-file"
                      className="h-9 px-3 bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded-md font-label-md text-[11px] flex items-center gap-1.5 cursor-pointer text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      Upload File
                    </label>
                    <input
                      type="text"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleInputChange}
                      className="flex-1 bg-surface border border-surface-variant rounded-md px-3 py-1.5 font-body-sm text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                      placeholder="Or paste image URL..."
                    />
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-2 relative w-16 h-20 border border-surface-variant rounded overflow-hidden">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl border-none cursor-pointer flex items-center"
                      >
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Shelf / Location</label>
                  <input
                    type="text"
                    name="shelf"
                    value={formData.shelf}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="e.g., Shelf 4B, Rack 2"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Other (Add New)">Other (Add New)...</option>
                  </select>
                  {formData.category === 'Other (Add New)' && (
                    <input
                      type="text"
                      placeholder="Enter new category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 mt-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                      required
                    />
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container rounded-md font-label-md text-[12px] transition-colors border-none cursor-pointer mt-2"
                >
                  Save Modifications
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. VIEW BOOK DETAILS MODAL */}
        {showViewModal && selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowViewModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-lg p-6 relative z-10 border border-surface-variant shadow-xl"
            >
              <div className="flex items-center justify-between mb-4 border-b border-surface-variant pb-2">
                <h3 className="text-sm font-bold text-primary m-0">Book Details Information</h3>
                <button onClick={() => setShowViewModal(false)} className="text-on-surface-variant hover:text-primary cursor-pointer bg-transparent border-none flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="space-y-3 font-body-sm text-xs text-on-surface-variant">
                {(() => {
                  const coverUrl = selectedBook.imageUrl || getBookCoverUrl(selectedBook.title);
                  return coverUrl ? (
                    <div className="flex justify-center mb-4">
                      <div className="w-24 h-32 border border-surface-variant rounded overflow-hidden shadow-md">
                        <img src={coverUrl} alt={selectedBook.title} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ) : null;
                })()}
                <div className="flex justify-between border-b border-surface-variant/40 py-2">
                  <span className="font-bold">Book Title:</span>
                  <span className="text-on-surface font-semibold text-right max-w-[240px]">{selectedBook.title}</span>
                </div>
                <div className="flex justify-between border-b border-surface-variant/40 py-2">
                  <span className="font-bold">Author Name:</span>
                  <span className="text-on-surface font-semibold">{selectedBook.author}</span>
                </div>
                <div className="flex justify-between border-b border-surface-variant/40 py-2">
                  <span className="font-bold">ISBN Number:</span>
                  <span className="text-on-surface font-mono font-semibold">{selectedBook.isbn}</span>
                </div>
                <div className="flex justify-between border-b border-surface-variant/40 py-2">
                  <span className="font-bold">Category Genre:</span>
                  <span className="text-on-surface font-semibold">{selectedBook.category}</span>
                </div>
                <div className="flex justify-between border-b border-surface-variant/40 py-2">
                  <span className="font-bold">Available / Total Copies:</span>
                  <span className="text-on-surface font-semibold">
                    {selectedBook.available_copies} / {selectedBook.total_copies}
                  </span>
                </div>
                <div className="flex justify-between border-b border-surface-variant/40 py-2">
                  <span className="font-bold">Library Shelf / Location:</span>
                  <span className="text-on-surface font-semibold">{selectedBook.shelf || 'Shelf 4B'}</span>
                </div>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="w-full py-2 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container rounded-md font-label-md text-[12px] transition-colors border-none cursor-pointer mt-4"
              >
                Close Details
              </button>
            </motion.div>
          </div>
        )}

        {/* 4. DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-lg p-6 relative z-10 border border-error/20 shadow-xl"
            >
              <div className="flex items-center gap-2 text-error mb-3">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                <h3 className="text-sm font-bold m-0 text-error">Confirm Catalog Delete</h3>
              </div>

              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed m-0 mb-4">
                Are you sure you want to delete <strong className="text-on-surface">"{selectedBook.title}"</strong> from the library catalog? This action is irreversible.
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 bg-surface-container border border-outline-variant rounded-md font-label-md text-[11px] text-on-surface hover:bg-surface-variant transition-colors cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBook}
                  className="flex-1 py-2 bg-error text-on-error hover:bg-red-700 rounded-md font-label-md text-[11px] font-semibold transition-colors cursor-pointer border-none"
                >
                  Delete Book
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 5. RENAME BOOK MODAL */}
        {showRenameModal && selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRenameModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-lg p-6 relative z-10 border border-surface-variant shadow-xl text-left"
            >
              <div className="flex items-center justify-between mb-4 border-b border-surface-variant pb-2">
                <h3 className="text-sm font-bold text-primary m-0">Rename Book</h3>
                <button onClick={() => setShowRenameModal(false)} className="text-on-surface-variant hover:text-primary cursor-pointer bg-transparent border-none flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleRenameSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Book Title</label>
                  <input
                    type="text"
                    required
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    className="w-full bg-surface border border-surface-variant rounded-md px-3 py-2 font-body-sm text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="Enter new book title"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRenameModal(false)}
                    className="flex-1 py-2 bg-surface-container border border-outline-variant rounded-md font-label-md text-[11px] text-on-surface hover:bg-surface-variant transition-colors cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-primary text-on-primary hover:bg-primary-container rounded-md font-label-md text-[11px] font-semibold transition-colors cursor-pointer border-none"
                  >
                    Rename
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
