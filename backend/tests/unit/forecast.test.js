// Linear trend forecast (no database needed).
const { fitLine, linearForecast } = require('../../src/services/forecast');

const series = (points) => ({
  groupBy: 'year',
  groupType: 'number',
  metrics: [{ key: 'm0', agg: 'avg', column: 'share' }],
  rows: points.map(([label, m0]) => ({ label, m0 })),
});

describe('fitLine', () => {
  test('recovers an exact line with R² = 1', () => {
    const { slope, intercept, r2 } = fitLine([
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
    ]);
    expect(slope).toBeCloseTo(2);
    expect(intercept).toBeCloseTo(0);
    expect(r2).toBeCloseTo(1);
  });
});

describe('linearForecast', () => {
  test('extends the trend from the last real value', () => {
    const result = linearForecast(series([[2020, 10], [2021, 12], [2022, 14]]), 2);
    const future = result.rows.filter((r) => r.forecast);

    expect(future.map((r) => r.label)).toEqual([2023, 2024]);
    expect(future.map((r) => r.f0)).toEqual([16, 18]);
    expect(result.rows[2].f0).toBe(14); // the dashed line starts on the last real point
    expect(result.forecast.models[0]).toMatchObject({ slopePerStep: 2, r2: 1, points: 3 });
  });

  test('refuses to forecast from fewer than 3 points', () => {
    const result = linearForecast(series([[2020, 10], [2021, 12]]), 3);
    expect(result.forecast.note).toMatch(/at least 3 points/);
    expect(result.rows.some((r) => r.forecast)).toBe(false);
  });
});
