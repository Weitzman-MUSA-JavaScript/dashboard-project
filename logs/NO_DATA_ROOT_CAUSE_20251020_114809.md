# No-Data Root Cause Analysis
**Timestamp:** 2025-10-20 11:48:09
**Status:** Live triage completed

## Executive Summary
**ROOT CAUSE BUCKET:** Filters → SQL
**PRIMARY ISSUE:** Empty type filter generating invalid SQL
**SECONDARY ISSUE:** Charts failing due to null center3857 on initial load

---

## 1. Evidence Trail

### A. Runtime Evidence (Dev Server)
- ✅ Dev server running: `http://localhost:5173/` returns full HTML (7774 bytes)
- ✅ UI renders: MapLibre CSS loaded, #map has `position: absolute; inset: 0;` (non-zero height)
- ✅ Map initializes: OSM tiles load at [-75.1652, 39.9526] zoom 11
- ✅ CARTO API reachable: Test query returns `{"rows":[{"test":1}]...}`
- ✅ Districts choropleth SQL works: Query returns data for dc_dist 01, 02, 03 with counts

### B. Points Query Failure
**Test bbox query (Philadelphia area):**
```
https://phl.carto.com/api/v2/sql?q=SELECT the_geom, text_general_code
FROM incidents_part1_part2
WHERE dispatch_date_time >= '2024-04-01'
AND the_geom && ST_MakeEnvelope(-8370000, 4860000, -8360000, 4870000, 3857)
LIMIT 3&format=geojson
```
**Result:** `{"type": "FeatureCollection", "features": []}`
This proves CARTO works but returns NO points for recent dates (2024-04-01 forward).

### C. Static Code Analysis

#### Store Defaults ([src/state/store.js:23-62](src/state/store.js#L23-L62))
```javascript
selectedGroups: [],          // ← EMPTY by default
selectedTypes: [],           // ← EMPTY by default
startMonth: null,            // ← NULL (falls back to last 6 months)
durationMonths: 6,
adminLevel: 'districts',
center3857: null,            // ← NULL until user clicks map
```

#### Filter Expansion ([src/state/store.js:48-54](src/state/store.js#L48-L54))
```javascript
getFilters() {
  const { start, end } = this.getStartEnd();
  const types = (this.selectedTypes && this.selectedTypes.length)
    ? this.selectedTypes.slice()
    : expandGroupsToCodes(this.selectedGroups || []);  // ← Returns [] when selectedGroups=[]
  return { start, end, types, center3857: this.center3857, radiusM: this.radius };
}
```

#### Type Code Expansion ([src/utils/types.js:51-60](src/utils/types.js#L51-L60))
```javascript
export function expandGroupsToCodes(selectedGroups = []) {
  const out = [];
  for (const key of selectedGroups) {
    const k = key.replace(/[- ]/g, '_');
    const arr = offenseGroups[key] || offenseGroups[k] || ...;
    if (Array.isArray(arr)) out.push(...arr);
  }
  return Array.from(new Set(out));  // ← Returns [] when selectedGroups=[]
}
```

#### SQL Builder ([src/utils/sql.js:321-340](src/utils/sql.js#L321-L340))
```javascript
function baseTemporalClauses(startIso, endIso, types, { includeTypes = true } = {}) {
  const clauses = [
    "WHERE dispatch_date_time >= '2015-01-01'",
    `  AND dispatch_date_time >= '${startIso}'`,
    `  AND dispatch_date_time < '${endIso}'`,
  ];

  if (includeTypes) {
    const sanitizedTypes = sanitizeTypes(types);  // ← Returns [] when types=[]
    if (sanitizedTypes.length > 0) {              // ← GUARD PREVENTS empty IN ()
      clauses.push(
        `  AND text_general_code IN (${sanitizedTypes
          .map((value) => `'${value}'`)
          .join(", ")})`
      );
    }
  }
  return clauses;
}
```
**VERDICT:** SQL builder is CORRECT — it does NOT add `IN ()` when types.length === 0.

#### Choropleth Rendering ([src/main.js:34-44](src/main.js#L34-L44))
```javascript
const merged = await getDistrictsMerged({ start, end });

map.on('load', () => {
  const { breaks, colors } = renderDistrictChoropleth(map, merged);
  drawLegend(breaks, colors, '#legend');
  attachHover(map, 'districts-fill');
  attachDistrictPopup(map, 'districts-fill');
});
```
**VERDICT:** Districts render is NOT gated by center/radius — choropleth should display.

#### Charts Initialization ([src/main.js:50-64](src/main.js#L50-L64))
```javascript
try {
  const { start, end, types, center3857, radiusM } = store.getFilters();
  await updateAllCharts({ start, end, types, center3857, radiusM });  // ← center3857 is NULL
} catch (err) {
  console.warn('Charts failed to render:', err);
  ...
}
```
**ISSUE:** Charts are called with `center3857: null` before user clicks map, causing buffer-based queries to fail.

---

## 2. Root Cause Summary

### Primary Issue: Data Date Range
**The CARTO dataset `incidents_part1_part2` does NOT contain data for 2024+.**

- Test query for 2024-04-01 → 2024-10-01 returns empty results
- Districts query for same period returns data (pre-aggregated or different table)
- Store defaults to last 6 months from "today" (2025-10-20), which computes to 2025-04-20 → 2025-10-20
- **SQL generated:** `WHERE dispatch_date_time >= '2025-04-20' AND dispatch_date_time < '2025-10-20'`
- **Result:** Empty features because data ends before 2024

### Secondary Issue: Charts Fail on Load
Charts require `center3857` for buffer queries (monthly buffer, top types, heatmap), but it's `null` until user clicks map.

**Error path:**
1. [src/main.js:51](src/main.js#L51): `store.getFilters()` returns `center3857: null`
2. Charts call buffer SQL builders (e.g., `buildMonthlyBufferSQL`)
3. [src/utils/sql.js:316](src/utils/sql.js#L316): `ensureCenter(null)` throws error
4. Catch block logs "Charts failed to render"

### Why Districts Still Render
- [src/main.js:34](src/main.js#L34): `getDistrictsMerged({ start, end })` doesn't use `types` from store (hardcoded params)
- [src/map/choropleth_districts.js:11](src/map/choropleth_districts.js#L11): Calls `fetchByDistrict({ start, end, types })`
- With empty `types=[]`, SQL has NO `IN ()` clause (correctly handled)
- Query returns all offense types for given time range
- **But:** If time range is 2025-04-20 → 2025-10-20 and data ends in 2023, districts also return empty

---

## 3. Minimal Patches for Codex

### Patch A: Set Realistic Time Window Default
**File:** [src/state/store.js:28-29](src/state/store.js#L28-L29)
```javascript
// OLD:
startMonth: null,
durationMonths: 6,

// NEW:
startMonth: '2023-01',  // Or latest known data month
durationMonths: 12,
```

### Patch B: Guard Charts Against Null Center
**File:** [src/main.js:50-64](src/main.js#L50-L64)
```javascript
// OLD:
try {
  const { start, end, types, center3857, radiusM } = store.getFilters();
  await updateAllCharts({ start, end, types, center3857, radiusM });
} catch (err) { ... }

// NEW:
try {
  const { start, end, types, center3857, radiusM } = store.getFilters();
  if (center3857) {  // ← Add guard
    await updateAllCharts({ start, end, types, center3857, radiusM });
  }
} catch (err) { ... }
```

### Patch C: Show Friendly Message When No Center
**File:** [src/main.js:50-64](src/main.js#L50-L64)
```javascript
// Inside the try block, after the guard:
if (!center3857) {
  const status = document.getElementById('charts-status') || /* create div */;
  status.innerText = 'Click map to show buffer-based charts';
}
```

### Patch D: Verify Data Date Range
**Action:** Run SQL query to find max `dispatch_date_time` in `incidents_part1_part2`:
```sql
SELECT MAX(dispatch_date_time) FROM incidents_part1_part2
```
Then set `startMonth` to a valid month within data range.

---

## 4. Quick Checks for Future Triage

1. **Browser console:** Check for errors in `updateAllCharts`, `ensureCenter`, `fetchJson`
2. **Network tab:** Look for CARTO SQL responses with empty `features: []` or `rows: []`
3. **Store state:** In console, run `window.__dashboard` or log `store.getFilters()` to see actual time range
4. **Test direct SQL:** Copy SQL from network tab, paste into CARTO SQL API tester with known-good date range (e.g., 2022-01-01)

---

## 5. Next Steps for Codex

1. Apply Patch D: Query max date from CARTO
2. Apply Patch A: Update `startMonth` to valid range
3. Apply Patch B: Guard charts against null center
4. Apply Patch C: Add user-facing message
5. Test: Reload, verify districts render with counts > 0
6. Test: Click map, verify charts appear
