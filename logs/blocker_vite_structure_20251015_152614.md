# BLOCKER: index.html Location — Vite Project Structure

**Timestamp:** 2025-10-15 15:26
**Status:** ACTIVE BLOCKER

---

## Evidence

### Current File Structure
```
dashboard-project-Ryan/
├── public/
│   └── index.html          ← CURRENTLY HERE (7735 bytes, modified 12:13)
├── src/
│   └── main.js
└── (no index.html in root) ← SHOULD BE HERE
```

### Build Error
**Command:** `npm run build`
**Result:** FAIL after 45ms

**Error Message:**
```
[vite:html-inline-proxy] Could not load C:/Users/.../public/index.html?html-proxy&inline-css&index=0.css
(imported by public/index.html): No matching HTML proxy module found
```

**Log:** [logs/diag_build_20251015_152614.log](diag_build_20251015_152614.log)

---

## Root Cause

### Vite Expects index.html in Project Root
Per [Vite documentation](https://vitejs.dev/guide/#index-html-and-project-root):

> "Vite treats `index.html` as source code that is part of the module graph... `index.html` is front-and-center instead of being tucked away inside `public`."

### Current public/index.html Issues
**Line 129:**
```html
<script type="module" src="../src/main.js"></script>
```

This uses a **relative path going UP** from `public/` (`../src/main.js`). Vite's HTML transform expects:
```html
<script type="module" src="/src/main.js"></script>
```
(absolute path from project root)

### Why public/ is Wrong Location
1. **Vite doesn't process `public/index.html`** — The `public/` directory is for **static assets** (images, fonts, etc.) that are copied as-is
2. **HTML proxy fails** — Vite's build plugin can't apply transformations (inline CSS, module resolution) to files in `public/`
3. **Module paths break** — Relative paths from `public/` require `../src/`, but Vite expects root-relative `/src/`

---

## Fix Required

**Move `/public/index.html` → `/index.html`**

**Steps:**
1. Copy `public/index.html` to project root
2. Fix script tag on line 129:
   ```diff
   -    <script type="module" src="../src/main.js"></script>
   +    <script type="module" src="/src/main.js"></script>
   ```
3. Delete `public/index.html`
4. Run `npm run build` to verify

---

## Previous Blocker Status (RESOLVED)

### ✅ offense_groups.json Fixed
**File:** [src/data/offense_groups.json:10-12](../src/data/offense_groups.json#L10-L12)

**Before:** `"Property": "Thefts"` (STRING)
**After:** `"Property": ["Thefts"]` (ARRAY)

**Status:** FIXED (verified 15:26)

### ✅ Duplicate index.html Resolved
**Before:** Both `/index.html` (90 lines) AND `/public/index.html` (131 lines) existed
**After:** Only `/public/index.html` remains (but in WRONG location)

**Status:** PARTIALLY FIXED (duplicate removed, but remaining file needs to move to root)

---

## Impact

- ❌ `npm run build` fails
- ❌ Cannot generate production bundle
- ❌ Cannot test `npm run preview`
- ❌ Cannot deploy to production
- ✅ `npm run dev` still works (Vite dev server more forgiving)

---

## Severity
🔴 **BLOCKER** — Prevents production deployment

---

## Resolution
⏳ **Pending codex fix** — Move index.html to root and fix script path
