import { BookCheck, BookOpen, CheckCircle2, Clock, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BookWithStatus, BooksSummary } from '../types.ts';
import { KpiGrid, SearchToolbar, TableSkeleton, type KpiMetric } from './DashboardPrimitives.tsx';

export type BookFilter = 'all' | 'borrowed' | 'available';

interface BooksViewProps {
  books: BookWithStatus[];
  summary: BooksSummary;
  loading: boolean;
  onIssueBook: (bookId: number) => void;
  onMarkReturned: (transactionId: number) => Promise<void>;
  returningId: number | null;
}

export function BooksView({
  books,
  summary,
  loading,
  onIssueBook,
  onMarkReturned,
  returningId,
}: BooksViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<BookFilter>('all');

  const metrics: KpiMetric[] = [
    {
      label: 'Total Books',
      value: summary.total_books,
      detail: 'Complete library catalog',
    },
    {
      label: 'Currently Borrowed Books',
      value: summary.borrowed_books,
      detail: 'Checked out to students',
      tone: 'amber',
    },
    {
      label: 'Available (Not Borrowed) Books',
      value: summary.available_books,
      detail: 'Ready for immediate issue',
      tone: 'emerald',
    },
  ];

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return books.filter((book) => {
      if (filter === 'borrowed' && !book.is_borrowed) return false;
      if (filter === 'available' && book.is_borrowed) return false;

      if (!q) return true;
      return (
        String(book.book_id).includes(q) ||
        book.book_name.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.borrower_name?.toLowerCase().includes(q) ?? false) ||
        (book.borrower_usn?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [books, filter, searchQuery]);

  return (
    <section className="space-y-5" aria-label="Books catalog and availability">
      <KpiGrid metrics={metrics} />

      <SearchToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by Book ID, title, author, or borrower name / USN..."
        filterValue={filter}
        onFilterChange={setFilter}
        filterOptions={[
          { value: 'all', label: 'All Books', count: summary.total_books },
          { value: 'borrowed', label: 'Borrowed', count: summary.borrowed_books },
          { value: 'available', label: 'Available (Not Borrowed)', count: summary.available_books },
        ]}
      />

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filteredBooks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-900">No books match your current filter</p>
          <p className="text-xs text-slate-500 mt-1">
            Try clearing the search query or switching to All Books.
          </p>
          {(searchQuery || filter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilter('all');
              }}
              className="mt-4 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Book ID</th>
                  <th className="py-3 px-4">Book Name</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4">Current Borrower</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredBooks.map((book) => (
                  <tr key={book.book_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs font-medium text-slate-600 whitespace-nowrap">
                      #{book.book_id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {book.book_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {book.author}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {book.is_borrowed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          Borrowed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Available
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {book.is_borrowed && book.borrower_name && book.borrower_usn ? (
                        <div>
                          <div className="font-medium text-slate-900">{book.borrower_name}</div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono tabular-nums">{book.borrower_usn}</span>
                            {book.active_borrow_date && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  Issued {book.active_borrow_date}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Not currently borrowed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {book.is_borrowed && book.active_transaction_id ? (
                        <button
                          type="button"
                          disabled={returningId === book.active_transaction_id}
                          onClick={() => onMarkReturned(book.active_transaction_id!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                        >
                          <BookCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          {returningId === book.active_transaction_id ? 'Updating...' : 'Mark as Returned'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onIssueBook(book.book_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                          <Plus className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                          Issue Book
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              Showing <span className="font-mono tabular-nums font-medium text-slate-700">{filteredBooks.length}</span> of{' '}
              <span className="font-mono tabular-nums font-medium text-slate-700">{books.length}</span> books
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
