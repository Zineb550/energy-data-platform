// CSV parsing and column type detection (no database needed).
const { parseCsv, detectType } = require('../../src/services/csv.service');

const csv = (text) => parseCsv(Buffer.from(text, 'utf8'));

describe('detectType', () => {
  test('numbers, including negatives, decimals and French decimal commas', () => {
    expect(detectType(['12', '-3.5', '1e6', '120,5'])).toBe('number');
  });

  test('ISO, year-month and French dates', () => {
    expect(detectType(['2024-05-01', '2024-05', '01/05/2024'])).toBe('date');
  });

  test('anything else is text', () => {
    expect(detectType(['Morocco', '12'])).toBe('text');
  });

  test('empty markers are ignored when detecting the type', () => {
    expect(detectType(['', 'NA', 'n/a', '-', '7'])).toBe('number');
  });
});

describe('parseCsv', () => {
  test('detects the semicolon separator and converts values to their type', () => {
    const { columns, rows } = csv('Date;City;Consumption\n01/01/2024;Rabat;120,5\n2024-01-02;Fes;\n');
    expect(columns).toEqual([
      { name: 'Date', type: 'date' },
      { name: 'City', type: 'text' },
      { name: 'Consumption', type: 'number' },
    ]);
    expect(rows[0]).toEqual({ Date: '2024-01-01', City: 'Rabat', Consumption: 120.5 });
    expect(rows[1].Consumption).toBeNull(); // empty cell = missing value
  });

  test('gives unique, non-empty names to duplicate or blank headers', () => {
    const { columns } = csv('year,year,\n2020,2021,x\n');
    expect(columns.map((c) => c.name)).toEqual(['year', 'year_2', 'column_3']);
  });

  test('rejects a file without data lines', () => {
    expect(() => csv('only,a,header\n')).toThrow(/at least one data line/);
  });
});
