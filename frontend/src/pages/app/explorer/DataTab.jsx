// Table view: search, filters, sorting and pagination, all done by the API.
import { useState } from 'react';
import { datasetsApi } from '../../../api/datasets';
import { useApi, useDebounce } from '../../../hooks/useApi';
import { Alert, Card, Input, Select, Spinner } from '../../../components/ui';
import { formatNumber, formatValue, humanize } from '../../../utils/format';
import FilterBar, { FilterChips } from './FilterBar';

export default function DataTab({ dataset }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState([]);
  const [sort, setSort] = useState({ by: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debouncedSearch = useDebounce(search);

  // Any change of criteria brings the user back to page 1.
  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const { data, loading, error } = useApi(
    () =>
      datasetsApi.rows(dataset.id, {
        page,
        pageSize,
        search: debouncedSearch,
        sortBy: sort.by,
        sortDir: sort.dir,
        filters: filters.length ? filters : undefined,
      }),
    [dataset.id, page, pageSize, debouncedSearch, filters, sort]
  );

  // Click on a header: ascending -> descending -> no sort.
  const toggleSort = (name) => {
    setPage(1);
    setSort((s) => {
      if (s.by !== name) return { by: name, dir: 'asc' };
      if (s.dir === 'asc') return { by: name, dir: 'desc' };
      return { by: null, dir: 'asc' };
    });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterBar columns={dataset.columns} onAdd={(f) => withReset(setFilters)([...filters, f])} />
          <Input className="max-w-xs" placeholder="Search in all columns…" value={search} onChange={(e) => withReset(setSearch)(e.target.value)} />
        </div>
        <FilterChips filters={filters} onRemove={(i) => withReset(setFilters)(filters.filter((_, j) => j !== i))} />
      </Card>

      {error && <Alert>{error.message}</Alert>}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 text-sm text-slate-600">
          <span className="flex items-center gap-2">
            {data ? `${formatNumber(data.total)} matching rows` : 'Loading rows'}
            {loading && <Spinner size="sm" />}
          </span>
          <span className="text-xs text-slate-400">Click a column name to sort</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2.5 font-medium text-slate-400">#</th>
                {dataset.columns.map((c) => (
                  <th key={c.name} className="whitespace-nowrap px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort(c.name)} className="flex cursor-pointer items-center gap-1 hover:text-slate-900">
                      {humanize(c.name)}
                      <span className="w-3 text-brand-700">{sort.by === c.name ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 ${loading ? 'opacity-50' : ''}`}>
              {data?.rows.map((row) => (
                <tr key={row._row} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs text-slate-400">{row._row}</td>
                  {dataset.columns.map((c) => {
                    const v = formatValue(row[c.name], c.name);
                    return (
                      <td key={c.name} className={`whitespace-nowrap px-3 py-2 ${c.type === 'number' ? 'text-right tabular-nums' : ''}`}>
                        {v === null ? <span className="text-slate-300">—</span> : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {data && !data.rows.length && (
                <tr>
                  <td colSpan={dataset.columns.length + 1} className="px-3 py-10 text-center text-slate-500">
                    No row matches these criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              Rows per page
              <Select className="w-auto py-1" value={pageSize} onChange={(e) => withReset(setPageSize)(Number(e.target.value))}>
                {[10, 25, 50, 100].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-600">
                Page {data.page} of {data.totalPages}
              </span>
              <PageButton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </PageButton>
              <PageButton disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                Next
              </PageButton>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function PageButton({ children, ...props }) {
  return (
    <button
      className="cursor-pointer rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}
