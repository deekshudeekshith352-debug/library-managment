import { BookMinus, BookOpenCheck, CheckCircle2, Clock, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { StudentWithBorrows } from '../types.ts';
import { KpiGrid, SearchToolbar, TableSkeleton, type KpiMetric } from './DashboardPrimitives.tsx';

export type StudentFilter = 'all' | 'borrowed' | 'never_borrowed';

interface StudentsViewProps {
  students: StudentWithBorrows[];
  loading: boolean;
  onIssueForStudent: (usn: string) => void;
}

export function StudentsView({ students, loading, onIssueForStudent }: StudentsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<StudentFilter>('all');

  const counts = useMemo(() => {
    const borrowedAtLeastOne = students.filter((s) => s.total_borrow_count > 0).length;
    const neverBorrowed = students.filter((s) => s.total_borrow_count === 0).length;
    const activeLoans = students.reduce((acc, s) => acc + s.active_borrow_count, 0);
    return {
      total: students.length,
      borrowedAtLeastOne,
      neverBorrowed,
      activeLoans,
    };
  }, [students]);

  const metrics: KpiMetric[] = [
    {
      label: 'Total Registered Students',
      value: counts.total,
      detail: 'Across all academic departments',
    },
    {
      label: 'Borrowed at Least One',
      value: counts.borrowedAtLeastOne,
      detail: 'Students with borrowing history',
      tone: 'blue',
    },
    {
      label: 'Never Borrowed',
      value: counts.neverBorrowed,
      detail: 'Students with no books borrowed',
      tone: 'amber',
    },
    {
      label: 'Currently Checked Out',
      value: counts.activeLoans,
      detail: 'Active unreturned books across students',
      tone: 'emerald',
    },
  ];

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((student) => {
      if (filter === 'borrowed' && student.total_borrow_count === 0) return false;
      if (filter === 'never_borrowed' && student.total_borrow_count > 0) return false;

      if (!q) return true;
      const matchesStudent =
        student.usn.toLowerCase().includes(q) ||
        student.name.toLowerCase().includes(q) ||
        student.department.toLowerCase().includes(q);
      const matchesBook = student.borrow_records.some(
        (r) =>
          r.book_name.toLowerCase().includes(q) ||
          r.author.toLowerCase().includes(q)
      );
      return matchesStudent || matchesBook;
    });
  }, [students, filter, searchQuery]);

  return (
    <section className="space-y-5" aria-label="Students borrowing records">
      <KpiGrid metrics={metrics} />

      <SearchToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by USN, student name, department, or book title..."
        filterValue={filter}
        onFilterChange={setFilter}
        filterOptions={[
          { value: 'all', label: 'All Students', count: counts.total },
          { value: 'borrowed', label: 'Borrowed at Least One', count: counts.borrowedAtLeastOne },
          { value: 'never_borrowed', label: 'Never Borrowed', count: counts.neverBorrowed },
        ]}
      />

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-900">No matching students found</p>
          <p className="text-xs text-slate-500 mt-1">
            Adjust your search query or switch the borrowing history filter.
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
                  <th className="py-3 px-4 whitespace-nowrap">USN</th>
                  <th className="py-3 px-4 whitespace-nowrap">Student Name</th>
                  <th className="py-3 px-4 whitespace-nowrap">Department</th>
                  <th className="py-3 px-4">Borrowed Books & Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.map((student) => (
                  <tr key={student.usn} className="hover:bg-slate-50/70 transition-colors align-top">
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs font-medium text-slate-700 whitespace-nowrap">
                      {student.usn}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {student.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {student.department}
                    </td>
                    <td className="py-3.5 px-4 min-w-[320px]">
                      {student.borrow_records.length === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <BookMinus className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                          No Books Borrowed
                        </span>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {student.borrow_records.map((record) => (
                            <div
                              key={record.transaction_id}
                              className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate">
                                  {record.book_name}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                  <span>{record.author}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums">
                                    Book #{record.book_id}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums">
                                    {record.borrow_date}
                                  </span>
                                </div>
                              </div>

                              {record.return_status === 'Borrowed' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap shrink-0">
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  Borrowed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                  Returned
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onIssueForStudent(student.usn)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                        Issue Book
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <BookOpenCheck className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              Showing <span className="font-mono tabular-nums font-medium text-slate-700">{filteredStudents.length}</span> of{' '}
              <span className="font-mono tabular-nums font-medium text-slate-700">{students.length}</span> students
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
