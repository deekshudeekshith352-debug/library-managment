import { BookPlus, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { BookWithStatus, StudentWithBorrows } from '../types.ts';

interface IssueBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentWithBorrows[];
  books: BookWithStatus[];
  initialUsn?: string;
  initialBookId?: number;
  onSubmitIssue: (payload: { usn: string; book_id: number; borrow_date: string }) => Promise<void>;
}

export function IssueBookModal({
  isOpen,
  onClose,
  students,
  books,
  initialUsn,
  initialBookId,
  onSubmitIssue,
}: IssueBookModalProps) {
  const availableBooks = books.filter((b) => !b.is_borrowed);
  const [selectedUsn, setSelectedUsn] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [borrowDate, setBorrowDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setBorrowDate(new Date().toISOString().slice(0, 10));
    setSelectedUsn(initialUsn || students[0]?.usn || '');

    if (initialBookId && books.some((b) => b.book_id === initialBookId && !b.is_borrowed)) {
      setSelectedBookId(String(initialBookId));
    } else {
      const firstAvailable = books.find((b) => !b.is_borrowed);
      setSelectedBookId(firstAvailable ? String(firstAvailable.book_id) : '');
    }
  }, [isOpen, initialUsn, initialBookId, students, books]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedUsn) {
      setErrorMessage('Please select a student USN.');
      return;
    }

    const parsedBookId = Number(selectedBookId);
    if (!Number.isInteger(parsedBookId) || parsedBookId <= 0) {
      setErrorMessage('Please select an available book to issue.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitIssue({
        usn: selectedUsn,
        book_id: parsedBookId,
        borrow_date: borrowDate,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to issue book.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-book-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <BookPlus className="w-5 h-5 text-blue-700" aria-hidden="true" />
            <h2 id="issue-book-modal-title" className="text-base font-semibold text-slate-900">
              Issue New Book
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="px-3.5 py-2.5 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg"
            >
              {errorMessage}
            </div>
          )}

          <div>
            <label htmlFor="issue-student-select" className="block text-xs font-medium text-slate-700 mb-1.5">
              Student (USN)
            </label>
            <select
              id="issue-student-select"
              value={selectedUsn}
              onChange={(e) => setSelectedUsn(e.target.value)}
              disabled={submitting || students.length === 0}
              className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              {students.map((student) => (
                <option key={student.usn} value={student.usn}>
                  {student.usn} — {student.name} ({student.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="issue-book-select" className="block text-xs font-medium text-slate-700">
                Book (ID & Title)
              </label>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {availableBooks.length} available
              </span>
            </div>
            <select
              id="issue-book-select"
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              disabled={submitting || availableBooks.length === 0}
              className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              {availableBooks.length === 0 ? (
                <option value="">No available books in catalog</option>
              ) : (
                books.map((book) => (
                  <option key={book.book_id} value={book.book_id} disabled={book.is_borrowed}>
                    #{book.book_id} — {book.book_name} ({book.author})
                    {book.is_borrowed ? ' [Currently Borrowed]' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="issue-borrow-date" className="block text-xs font-medium text-slate-700 mb-1.5">
              Borrow Date
            </label>
            <input
              id="issue-borrow-date"
              type="date"
              value={borrowDate}
              onChange={(e) => setBorrowDate(e.target.value)}
              required
              disabled={submitting}
              className="w-full h-10 px-3 text-sm font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || availableBooks.length === 0 || students.length === 0}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {submitting ? 'Issuing Book...' : 'Issue Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
