import os

filepath = 'src/components/IssueReturnForm.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states
target1 = """  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [bookTitle, setBookTitle] = useState('');"""
replacement1 = """  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentClassName, setStudentClassName] = useState('');
  const [studentClassSection, setStudentClassSection] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [bookTitle, setBookTitle] = useState('');"""
content = content.replace(target1, replacement1)

# 2. handleClearStudent
target2 = """    setStudentRollNumber('');
    setStudentEmail('');
  };"""
replacement2 = """    setStudentRollNumber('');
    setStudentEmail('');
    setStudentClassName('');
    setStudentClassSection('');
    setStudentAge('');
  };"""
content = content.replace(target2, replacement2)

# 3. handleIssueSubmit payload
target3 = """        studentRollNumber,
        studentEmail,
        bookTitle,"""
replacement3 = """        studentRollNumber,
        studentEmail,
        studentClassName,
        studentClassSection,
        studentAge,
        bookTitle,"""
content = content.replace(target3, replacement3)

# 4. handleStudentSelect
target4 = """    setStudentEmail(student.email || `${student.name.toLowerCase().replace(/\\s+/g, '')}@gowthami.edu.in`);
    setShowStudentDropdown(false);"""
replacement4 = """    setStudentEmail(student.email || `${student.name.toLowerCase().replace(/\\s+/g, '')}@gowthami.edu.in`);
    setStudentClassName('');
    setStudentClassSection('');
    setStudentAge('');
    setShowStudentDropdown(false);"""
content = content.replace(target4, replacement4)

# 5. Student JSX replace
student_jsx_target = """                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Search Student Autocomplete */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Search Student (Optional)</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <Hash size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Type student name or admission number..."
                            value={studentSearch}
                            onChange={(e) => {
                              setStudentSearch(e.target.value);
                              setShowStudentDropdown(true);
                            }}
                            onFocus={() => setShowStudentDropdown(true)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                          {selectedStudent && (
                            <button type="button" onClick={handleClearStudent} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Options */}
                        {showStudentDropdown && studentSearch && (
                          <div className="absolute left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto mt-1 shadow-lg divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredStudents.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">No matching students found</div>
                            ) : (
                              filteredStudents.map(s => (
                                <button
                                  key={s.student_id}
                                  type="button"
                                  onClick={() => handleStudentSelect(s)}
                                  className="w-full text-left p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350 flex justify-between items-center cursor-pointer"
                                >
                                  <span className="font-semibold">{s.name}</span>
                                  <span className="font-mono text-[10px] text-slate-400">{s.admission_number}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Student ID / Roll Number */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Student ID / Roll Number</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <Hash size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Enter Student ID / Roll Number..."
                            value={studentRollNumber}
                            onChange={(e) => setStudentRollNumber(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Student Name</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Enter Student Name..."
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email Address</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <Mail size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="email"
                            placeholder="Enter Email Address..."
                            value={studentEmail}
                            onChange={(e) => setStudentEmail(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Department / Branch</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <GraduationCap size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Enter Department / Branch..."
                            value={classGrade}
                            onChange={(e) => setClassGrade(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Phone</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Enter Contact Phone..."
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                    </div>"""

student_jsx_replacement = """                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Student Name</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Enter Student Name..."
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Student ID / Roll Number */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Student ID / Roll Number</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <Hash size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Enter Student ID / Roll Number..."
                            value={studentRollNumber}
                            onChange={(e) => setStudentRollNumber(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email Address</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <Mail size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="email"
                            placeholder="Enter Email Address..."
                            value={studentEmail}
                            onChange={(e) => setStudentEmail(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Class Name</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <GraduationCap size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Enter Class Name..."
                            value={studentClassName}
                            onChange={(e) => setStudentClassName(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Class Section</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Enter Class Section..."
                            value={studentClassSection}
                            onChange={(e) => setStudentClassSection(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Age</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="number"
                            placeholder="Enter Age..."
                            value={studentAge}
                            onChange={(e) => setStudentAge(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Department / Branch</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <GraduationCap size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Enter Department / Branch..."
                            value={classGrade}
                            onChange={(e) => setClassGrade(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Phone</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Enter Contact Phone..."
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                    </div>"""
content = content.replace(student_jsx_target, student_jsx_replacement)

# 6. Remove Search Book (Optional)
book_search_target = """                      {/* Search Book Autocomplete */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Search Book (Optional)</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <BookOpen size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Type book title or ISBN..."
                            value={bookSearch}
                            onChange={(e) => {
                              setBookSearch(e.target.value);
                              setShowBookDropdown(true);
                            }}
                            onFocus={() => setShowBookDropdown(true)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                          {selectedBook && (
                            <button type="button" onClick={handleClearBook} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Options */}
                        {showBookDropdown && bookSearch && (
                          <div className="absolute left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto mt-1 shadow-lg divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredBooks.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">No matching books found</div>
                            ) : (
                              filteredBooks.map(b => {
                                const avail = b.available_copies ?? b.available ?? 0;
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => handleBookSelect(b)}
                                    disabled={avail === 0}
                                    className="w-full text-left p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350 flex justify-between items-center cursor-pointer disabled:opacity-50"
                                  >
                                    <span className="font-semibold truncate max-w-[200px]">{b.title}</span>
                                    <span className="font-mono text-[10px] text-slate-400">{avail} available {avail === 0 && '(OUT)'}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

"""
content = content.replace(book_search_target, "")

# 7. Remove Shelf Location and Physical Condition
book_condition_target = """                      {/* Shelf / Rack Location (Read-only) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Shelf / Rack Location (Read-only)</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold select-none">
                          <Package size={14} className="text-slate-400 shrink-0" />
                          <span>{shelfLocation || 'Auto-filled based on copy'}</span>
                        </div>
                      </div>

                      {/* Physical Condition Dropdown */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Physical Condition</label>
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <span className="text-slate-400 shrink-0 text-xs pl-2">🛠️</span>
                          <select
                            value={physicalCondition}
                            onChange={(e) => setPhysicalCondition(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none flex-1 py-1.5 cursor-pointer"
                          >
                            <option value="Excellent">Excellent</option>
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Damaged">Damaged</option>
                          </select>
                        </div>
                      </div>"""
content = content.replace(book_condition_target, "")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete.")
