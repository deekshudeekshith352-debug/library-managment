import { Database, X } from 'lucide-react';
import { useEffect } from 'react';

interface SchemaGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: 'postgresql' | 'mock';
}

export function SchemaGuideModal({ isOpen, onClose, dataSource }: SchemaGuideModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schema-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-blue-700" aria-hidden="true" />
            <h2 id="schema-modal-title" className="text-base font-semibold text-slate-900">
              PostgreSQL Schema & Aiven Connection
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-sm text-slate-700">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed">
            <span className="font-semibold text-slate-900">Active Mode: </span>
            {dataSource === 'postgresql'
              ? 'Connected to PostgreSQL via DATABASE_URL with SSL enabled.'
              : 'Preview Sample Data (in-memory fallback). Add your Aiven PostgreSQL DATABASE_URL in .env to persist directly to PostgreSQL.'}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-900 mb-2">
              Required Three-Table Schema
            </h3>
            <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
{`CREATE TABLE student (
  usn VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(120) NOT NULL
);

CREATE TABLE book (
  book_id SERIAL PRIMARY KEY,
  book_name VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL
);

CREATE TABLE borrow_records (
  transaction_id SERIAL PRIMARY KEY,
  usn VARCHAR(50) NOT NULL REFERENCES student(usn),
  book_id INTEGER NOT NULL REFERENCES book(book_id),
  borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_status VARCHAR(20) NOT NULL CHECK (return_status IN ('Borrowed', 'Returned'))
);`}
            </pre>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-900 mb-1.5">
              Connecting Locally to Aiven PostgreSQL
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Set <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-900">DATABASE_URL</code> in your local <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-900">.env</code> file (or environment secrets). On startup, the Express backend connects with SSL enabled, creates these tables if absent, and seeds starter rows if empty.
            </p>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
