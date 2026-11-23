import { ArrowLeftRight, BookOpen, Database, Plus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BooksView } from './components/BooksView.tsx';
import { IssueBookModal } from './components/IssueBookModal.tsx';
import { ReturnStatusView } from './components/ReturnStatusView.tsx';
import { SchemaGuideModal } from './components/SchemaGuideModal.tsx';
import { StudentsView } from './components/StudentsView.tsx';
import type { LibrarySnapshot } from './types.ts';

type ActiveTab = 'students' | 'books' | 'returns';

const EMPTY_SNAPSHOT: LibrarySnapshot = {
  students: [],
  books: [],
  booksSummary: {
    total_books: 0,
    borrowed_books: 0,
    available_books: 0,
  },
  transactions: [],
  dataSource: 'mock',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('students');
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issuePresetUsn, setIssuePresetUsn] = useState<string | undefined>(undefined);
  const [issuePresetBookId, setIssuePresetBookId] = useState<number | undefined>(undefined);
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  const fetchLibrarySnapshot = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetch('/api/library');
      if (!res.ok) {
        throw new Error('Failed to load library data.');
      }
      const data: LibrarySnapshot = await res.json();
      setSnapshot(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to reach library server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrarySnapshot();
  }, [fetchLibrarySnapshot]);

  useEffect(() => {
    if (!actionFeedback) return;
    const timer = window.setTimeout(() => setActionFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [actionFeedback]);

  const openIssueModal = (options?: { usn?: string; bookId?: number }) => {
    setIssuePresetUsn(options?.usn);
    setIssuePresetBookId(options?.bookId);
    setIssueModalOpen(true);
  };

  const handleIssueSubmit = async (payload: { usn: string; book_id: number; borrow_date: string }) => {
    const res = await fetch('/api/borrow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not issue book.');
    }

    if (data.snapshot) {
      setSnapshot(data.snapshot);
    } else {
      await fetchLibrarySnapshot();
    }
    setActionFeedback({
      type: 'success',
      message: `Issued Book #${payload.book_id} to ${payload.usn}.`,
    });
  };

  const handleMarkReturned = async (transactionId: number) => {
    setReturningId(transactionId);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/return`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not update return status.');
      }

      if (data.snapshot) {
        setSnapshot(data.snapshot);
      } else {
        await fetchLibrarySnapshot();
      }
      setActionFeedback({
        type: 'success',
        message: `Transaction TX-${String(transactionId).padStart(3, '0')} marked as Returned.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to mark book as returned.',
      });
    } finally {
      setReturningId(null);
    }
  };

  const pendingCount = snapshot.transactions.filter((t) => t.return_status === 'Borrowed').length;

  const navItems: { id: ActiveTab; label: string; count: number; icon: typeof Users }[] = [
    { id: 'students', label: 'Students', count: snapshot.students.length, icon: Users },
    { id: 'books', label: 'Books', count: snapshot.books.length, icon: BookOpen },
    { id: 'returns', label: 'Return Status', count: pendingCount, icon: ArrowLeftRight },
  ];

  const activeTabMeta: Record<ActiveTab, { title: string; subtitle: string }> = {
    students: {
      title: 'Students',
      subtitle: 'Student directory joined with borrow records and active checkouts.',
    },
    books: {
      title: 'Books',
      subtitle: 'Catalog inventory showing current borrowers and available copies.',
    },
    returns: {
      title: 'Return Status',
      subtitle: 'Circulation ledger separating pending checkouts from returned books.',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 bg-white border-r border-slate-200">
        <div className="h-16 px-5 flex items-center border-b border-slate-200">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Campus Library
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Library sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-blue-700' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </span>
                <span
                  className={`font-mono tabular-nums text-xs ${
                    isActive ? 'text-blue-700 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => setSchemaModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <span className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>SQL Schema & Aiven</span>
            </span>
          </button>
          <div className="px-3 py-1 text-[11px] text-slate-500">
            Source:{' '}
            <span className="font-medium text-slate-700">
              {snapshot.dataSource === 'postgresql' ? 'PostgreSQL (SSL)' : 'Preview Sample Data'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb Left — Primary Action Right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-slate-900 lg:hidden whitespace-nowrap shrink-0">
              Campus Library
            </span>
            <span className="text-slate-300 lg:hidden" aria-hidden="true">/</span>
            <span className="hidden lg:inline text-sm text-slate-500 whitespace-nowrap shrink-0">
              Library
            </span>
            <span className="hidden lg:inline text-slate-300" aria-hidden="true">/</span>
            <h1 className="text-sm font-semibold text-slate-900 truncate">
              {activeTabMeta[activeTab].title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openIssueModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Issue New Book
            </button>
          </div>
        </header>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{item.label}</span>
                <span className="font-mono tabular-nums text-[11px]">{item.count}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSchemaModalOpen(true)}
            className="ml-auto px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0"
          >
            SQL Schema
          </button>
        </div>

        {/* Workspace Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                {activeTabMeta[activeTab].title}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">{activeTabMeta[activeTab].subtitle}</p>
            </div>
          </div>

          {actionFeedback && (
            <div
              role="status"
              className={`px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              <span>{actionFeedback.message}</span>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                className="ml-4 text-xs underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {loadError ? (
            <div
              role="alert"
              className="bg-white border border-red-200 rounded-xl p-6 text-center space-y-3"
            >
              <p className="text-sm font-medium text-red-800">{loadError}</p>
              <button
                type="button"
                onClick={fetchLibrarySnapshot}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'students' && (
                <StudentsView
                  students={snapshot.students}
                  loading={loading}
                  onIssueForStudent={(usn) => openIssueModal({ usn })}
                />
              )}

              {activeTab === 'books' && (
                <BooksView
                  books={snapshot.books}
                  summary={snapshot.booksSummary}
                  loading={loading}
                  onIssueBook={(bookId) => openIssueModal({ bookId })}
                  onMarkReturned={handleMarkReturned}
                  returningId={returningId}
                />
              )}

              {activeTab === 'returns' && (
                <ReturnStatusView
                  transactions={snapshot.transactions}
                  loading={loading}
                  onMarkReturned={handleMarkReturned}
                  returningId={returningId}
                />
              )}
            </>
          )}
        </main>
      </div>

      <IssueBookModal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        students={snapshot.students}
        books={snapshot.books}
        initialUsn={issuePresetUsn}
        initialBookId={issuePresetBookId}
        onSubmitIssue={handleIssueSubmit}
      />

      <SchemaGuideModal
        isOpen={schemaModalOpen}
        onClose={() => setSchemaModalOpen(false)}
        dataSource={snapshot.dataSource}
      />
    </div>
  );
}
