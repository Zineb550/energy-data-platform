// Lets the user build filters like  country = Morocco,  year >= 2010.
// Reused later by the analysis builder and the dashboards.
import { useState } from 'react';
import { Button, Input, Select } from '../../../components/ui';
import { humanize } from '../../../utils/format';

export const OPERATORS = {
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'contains',
};

export function FilterChips({ filters, onRemove }) {
  if (!filters.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f, i) => (
        <span key={i} className="inline-flex items-center gap-2 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-xs font-medium text-brand-800">
          {humanize(f.column)} {OPERATORS[f.op]} {String(f.value)}
          {onRemove && (
            <button
              onClick={() => onRemove(i)}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full hover:bg-brand-100"
              aria-label="Remove filter"
            >
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

export default function FilterBar({ columns, onAdd }) {
  const [column, setColumn] = useState(columns[0]?.name || '');
  const [op, setOp] = useState('eq');
  const [value, setValue] = useState('');

  const colType = columns.find((c) => c.name === column)?.type;

  const add = (e) => {
    e.preventDefault();
    if (value.trim() === '') return;
    onAdd({ column, op, value: colType === 'number' ? Number(value) : value.trim() });
    setValue('');
  };

  return (
    <form onSubmit={add} className="flex flex-wrap items-center gap-2">
      <Select className="w-auto" value={column} onChange={(e) => setColumn(e.target.value)}>
        {columns.map((c) => (
          <option key={c.name} value={c.name}>
            {humanize(c.name)}
          </option>
        ))}
      </Select>
      <Select className="w-auto" value={op} onChange={(e) => setOp(e.target.value)}>
        {Object.entries(OPERATORS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </Select>
      <Input
        className="w-40"
        type={colType === 'number' && op !== 'contains' ? 'number' : 'text'}
        step="any"
        placeholder="Value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button type="submit" variant="secondary">
        Add filter
      </Button>
    </form>
  );
}
