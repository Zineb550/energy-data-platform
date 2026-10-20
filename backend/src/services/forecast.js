// Advanced feature 3: simple forecast with a linear trend (least squares).
//
// For each indicator, we fit  y = a + b * x  on the history (x = year) with
// least squares, then continue the trend from the LAST known value:
//   forecast(x) = y_last + b * (x - x_last)
//   b  = the trend: how much the indicator changes per year
//   R² = how well a straight line explains the history (1 = perfectly)
// Starting from the last value (instead of the fitted line) avoids a jump
// between the last real point and the first forecast point.
//
// Forecast values are stored in separate keys (f0, f1...) so the chart can
// draw them as dashed lines after the real values (m0, m1...).

const round = (v) => Math.round(v * 1000) / 1000;

function fitLine(points) {
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of points) {
    sxy += (p.x - meanX) * (p.y - meanY);
    sxx += (p.x - meanX) ** 2;
    syy += (p.y - meanY) ** 2;
  }
  const slope = sxx ? sxy / sxx : 0;
  const intercept = meanY - slope * meanX;
  const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 1;
  return { slope, intercept, r2 };
}

function linearForecast(result, periods) {
  const rows = result.rows;
  // Time step = usual gap between two labels (1 for years).
  const gaps = rows.slice(1).map((r, i) => r.label - rows[i].label).filter((g) => g > 0);
  const step = gaps.length ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 1;

  const models = result.metrics.map((m, i) => {
    const points = rows.filter((r) => r[m.key] !== null).map((r) => ({ x: r.label, y: r[m.key] }));
    if (points.length < 3) return { key: `f${i}`, metric: m.key, available: false };
    return { key: `f${i}`, metric: m.key, available: true, ...fitLine(points), points: points.length };
  });

  if (!rows.length || !models.some((md) => md.available)) {
    return { ...result, forecast: { periods, step, models, note: 'Not enough history (at least 3 points are needed).' } };
  }

  // The last real point also gets the forecast value, so the dashed line starts from it.
  const last = rows[rows.length - 1];
  const extended = rows.map((r) => ({ ...r }));
  models.forEach((md) => {
    if (md.available) extended[extended.length - 1][md.key] = last[md.metric];
  });

  for (let k = 1; k <= periods; k++) {
    const x = last.label + k * step;
    const row = { label: x, forecast: true };
    result.metrics.forEach((m) => {
      row[m.key] = null;
    });
    models.forEach((md) => {
      const lastValue = last[md.metric] ?? md.intercept + md.slope * last.label;
      row[md.key] = md.available ? round(lastValue + md.slope * (x - last.label)) : null;
    });
    extended.push(row);
  }

  return {
    ...result,
    rows: extended,
    forecast: {
      periods,
      step,
      models: models.map(({ key, metric, available, slope, r2, points }) =>
        available ? { key, metric, available, slopePerStep: round(slope * step), r2: round(r2), points } : { key, metric, available }
      ),
    },
  };
}

module.exports = { linearForecast, fitLine };
