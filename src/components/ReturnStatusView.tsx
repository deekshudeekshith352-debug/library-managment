import { ArrowLeftRight, BookCheck, CheckCircle2, Clock } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BorrowTransaction } from '../types.ts';
import { KpiGrid, SearchToolbar, TableSkeleton, type KpiMetric } from './DashboardPrimitives.tsx';

export type TransactionFilter = 'all' | 'pending' | 'returned';

interface ReturnStatusViewProps {
  transactions: BorrowTransaction[];
  loading: boolean;
  onMarkReturned: (transactionId: number) => Promise<void>;
  returningId: number | null;
}

export function ReturnStatusView({
  transactions,
  loading,
  onMarkReturned,
  returningId,
}: ReturnStatusViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TransactionFilter>('all');

  const counts = useMemo(() => {
    const pending = transactions.filter((t) => t.return_status === 'Borrowed').length;
    const returned = transactions.filter((t) => t.return_status === 'Returned').length;
    return {
      total: transactions.length,
      pending,
      returned,
    };
  }, [transactions]);

  const metrics: KpiMetric[] = [
    {
      label: 'Total Transactions',
      value: counts.total,
      detail: 'All recorded borrow events',
    },
    {
      label: 'Not Returned (Pending)',
      value: counts.pending,
      detail: 'Books awaiting return',
      tone: 'amber',
    },
    {
      label: 'Returned Books',
      value: counts.returned,
      detail: 'Completed and checked back in',
      tone: 'emerald',
    },
  ];

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filter === 'pending' && tx.return_status !== 'Borrowed') return false;
      if (filter === 'returned' && tx.return_status !== 'Returned') return false;

      if (!q) return true;
      return (
        String(tx.transaction_id).includes(q) ||
        tx.book_name.toLowerCase().includes(q) ||
        tx.author.toLowerCase().includes(q) ||
        tx.student_name.toLowerCase().includes(q) ||
        tx.usn.toLowerCase().includes(q)
      );
    });
  }, [transactions, filter, searchQuery]);

  return (
    <section className="space-y-5" aria-label="Return status ledger">
      <KpiGrid metrics={metrics} />

      <SearchToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by transaction ID, book, author, student name, or USN..."
        filterValue={filter}
        onFilterChange={setFilter}
        filterOptions={[
          { value: 'all', label: 'All Transactions', count: counts.total },
          { value: 'pending', label: 'Not Returned / Pending', count: counts.pending },
          { value: 'returned', label: 'Returned', count: counts.returned },
        ]}
      />

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-900">No transactions match this filter</p>
          <p className="text-xs text-slate-500 mt-1">
            Try clearing your search or viewing all transactions.
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
                  <th className="py-3 px-4 whitespace-nowrap">Transaction ID</th>
                  <th className="py-3 px-4">Book & Author</th>
                  <th className="py-3 px-4">Student & USN</th>
                  <th className="py-3 px-4 whitespace-nowrap">Borrow Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Return Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTransactions.map((tx) => {
                  const isPending = tx.return_status === 'Borrowed';
                  const isUpdating = returningId === tx.transaction_id;

                  return (
                    <tr key={tx.transaction_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs font-medium text-slate-600 whitespace-nowrap">
                        TX-{String(tx.transaction_id).padStart(3, '0')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{tx.book_name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span>{tx.author}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">Book #{tx.book_id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{tx.student_name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span className="font-mono tabular-nums">{tx.usn}</span>
                          <span aria-hidden="true">·</span>
                          <span>{tx.department}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {tx.borrow_date}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            Borrowed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Returned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => onMarkReturned(tx.transaction_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                          >
                            <BookCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            {isUpdating ? 'Marking...' : 'Mark as Returned'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              Showing <span className="font-mono tabular-nums font-medium text-slate-700">{filteredTransactions.length}</span> of{' '}
              <span className="font-mono tabular-nums font-medium text-slate-700">{transactions.length}</span> transactions
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
