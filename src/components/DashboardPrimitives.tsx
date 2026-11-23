import { Search, X } from 'lucide-react';

export interface KpiMetric {
  label: string;
  value: number;
  detail: string;
  tone?: 'default' | 'emerald' | 'amber' | 'blue';
}

export function KpiGrid({ metrics }: { metrics: KpiMetric[] }) {
  const colsClass =
    metrics.length === 4 ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3';

  return (
    <div className={`grid ${colsClass} gap-4`}>
      {metrics.map((metric) => {
        const valueColor =
          metric.tone === 'emerald'
            ? 'text-emerald-700'
            : metric.tone === 'amber'
              ? 'text-amber-700'
              : metric.tone === 'blue'
                ? 'text-blue-700'
                : 'text-slate-900';

        return (
          <div
            key={metric.label}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-2"
          >
            <span className="text-xs font-medium text-slate-500">{metric.label}</span>
            <div className={`text-3xl font-semibold tracking-tight font-mono tabular-nums ${valueColor}`}>
              {metric.value}
            </div>
            <span className="text-xs text-slate-500">{metric.detail}</span>
          </div>
        );
      })}
    </div>
  );
}

interface SearchToolbarProps<T extends string> {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filterValue: T;
  onFilterChange: (value: T) => void;
  filterOptions: { value: T; label: string; count: number }[];
}

export function SearchToolbar<T extends string>({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  filterValue,
  onFilterChange,
  filterOptions,
}: SearchToolbarProps<T>) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3">
      <div className="relative flex-1 min-w-0 lg:max-w-md">
        <Search
          className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full h-10 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Filter records"
        className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto"
      >
        {filterOptions.map((option) => {
          const isActive = filterValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onFilterChange(option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{option.label}</span>
              <span
                className={`font-mono tabular-nums text-[11px] ${
                  isActive ? 'text-blue-700 font-semibold' : 'text-slate-400'
                }`}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid gap-4 px-5 py-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, colIdx) => (
              <div key={colIdx} className="h-4 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
