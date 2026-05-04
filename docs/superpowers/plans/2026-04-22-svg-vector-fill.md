# SVG Vector Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rasterise-then-scan fill path in `server/src/toolPath/SVGFill.js` with a direct vector scanline hatcher that accepts fractional `fill_density`.

**Architecture:** Rewrite `svgToSegments`'s fill branch to emit horizontal hatch segments in float mm coordinates, produced by intersecting scanlines at `1/fillDensity` mm intervals with polyline edges of each filled shape. Delete the now-unused canvas helpers. Widen the `fill_density` settings schema to allow fractional values, and thread the `precision` prop through the fill density NumberInput in both laser and writeAndDraw Config panels.

**Tech Stack:** Server-side JS (ESM, Node 14 in container). Client-side React + Redux + antd. No new deps.

**Spec:** `docs/superpowers/specs/2026-04-21-svg-vector-fill-design.md`

**Testing reality check:** The server has a webpack build but no unit-test runner. The client has no unit-test runner either. Validation is `node --check` on the server file + `docker compose build web` for the client bundle + manual end-to-end in the container. Don't invent a test framework.

---

## File Map

**Modified (five files):**

- `server/src/toolPath/SVGFill.js` — full rewrite of `svgToSegments`'s fill branch; delete `mapPointToInteger`, `drawPoint`, `drawLine`, `fillShape`, `canvasToSegments`.
- `web/src/containers/laser/lib/settings/svg.json` — widen `fill_density` schema.
- `web/src/containers/writeAndDraw/lib/settings/svg.json` — same schema change.
- `web/src/containers/laser/ui/Config/ConfigSvg.jsx` — pass `precision` prop to `NumberInput`.
- `web/src/containers/writeAndDraw/ui/Config/ConfigSvg.jsx` — same prop change.

**Not touched:** `server/src/toolPath/toolPathStr4svg.js` (consumer of `svgToSegments` — API unchanged), any reducer, any CSS, other settings JSONs, the SVGParser (already tessellates beziers to polylines).

---

### Task 1: Rewrite `svgToSegments` fill branch

**Files:**
- Modify: `server/src/toolPath/SVGFill.js`

Reference: the spec's algorithm section. The outline-emitting logic used in the fill-enabled branch mirrors the existing fill-disabled branch.

- [ ] **Step 1: Replace the file contents**

Overwrite `server/src/toolPath/SVGFill.js` entirely with:

```js
export function svgToSegments(svg, options = {}) {
    const segments = [];

    if (!options.fillEnabled) {
        for (const shape of svg.shapes) {
            if (!shape.visibility) continue;
            for (const path of shape.paths) {
                for (let i = 0; i < path.points.length - 1; i++) {
                    segments.push({start: path.points[i], end: path.points[i + 1]});
                }
            }
        }
        return segments;
    }

    const lineSpacing = 1 / options.fillDensity;

    for (const shape of svg.shapes) {
        if (!shape.visibility) continue;

        // Emit outline as vector segments so filled shapes keep a crisp boundary.
        for (const path of shape.paths) {
            for (let i = 0; i < path.points.length - 1; i++) {
                segments.push({start: path.points[i], end: path.points[i + 1]});
            }
        }

        if (!shape.fill) continue;

        const closedPaths = shape.paths.filter(p => p.closed);
        if (closedPaths.length === 0) continue;

        let minY = Infinity;
        let maxY = -Infinity;
        for (const path of closedPaths) {
            for (const [, y] of path.points) {
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        if (!isFinite(minY)) continue;

        for (let y = minY; y <= maxY; y += lineSpacing) {
            const crossings = [];
            for (const path of closedPaths) {
                const pts = path.points;
                for (let i = 0; i < pts.length - 1; i++) {
                    const [x1, y1] = pts[i];
                    const [x2, y2] = pts[i + 1];
                    if (x1 === x2 && y1 === y2) continue;
                    if (y1 === y2) continue;
                    const lo = Math.min(y1, y2);
                    const hi = Math.max(y1, y2);
                    // Half-open [lo, hi) to avoid double-counting shared vertices.
                    if (y < lo || y >= hi) continue;
                    const x = x1 + (y - y1) * (x2 - x1) / (y2 - y1);
                    crossings.push(x);
                }
            }
            crossings.sort((a, b) => a - b);
            for (let i = 0; i + 1 < crossings.length; i += 2) {
                segments.push({
                    start: [crossings[i], y],
                    end: [crossings[i + 1], y]
                });
            }
        }
    }

    return segments;
}
```

Notes for the implementer:
- The ENTIRE file is replaced. The old helpers (`mapPointToInteger`, `drawPoint`, `drawLine`, `fillShape`, `canvasToSegments`) are deleted because nothing outside `svgToSegments` referenced them.
- The fill-disabled branch (outline-only) is semantically unchanged from the original — it's just reformatted with braces inline and written earlier in control flow.
- Units are mm throughout. `toolPathStr4svg.js` already passes float mm points into this function via the SVGParser, and consumes float mm segments on the way out.

- [ ] **Step 2: Verify there are no other callers referencing the deleted helpers**

Run: `grep -rn "mapPointToInteger\|drawPoint\|drawLine\|fillShape\|canvasToSegments" server/src web/src 2>&1 | grep -v "^$"`

Expected: no matches, OR matches only within `server/src/toolPath/SVGFill.js` (which no longer contains them after Step 1). If matches exist elsewhere, stop and report BLOCKED — the deletion isn't safe.

- [ ] **Step 3: Syntax check**

Run: `node --check server/src/toolPath/SVGFill.js`
Expected: no output.

- [ ] **Step 4: Verify the file still exports `svgToSegments`**

Run: `grep -n "export function svgToSegments" server/src/toolPath/SVGFill.js`
Expected: one match at line 1.

- [ ] **Step 5: Commit**

```bash
git add server/src/toolPath/SVGFill.js
git commit -m "rewrite SVGFill as vector scanline hatcher"
```

---

### Task 2: Widen `fill_density` schema in laser svg settings

**Files:**
- Modify: `web/src/containers/laser/lib/settings/svg.json`

- [ ] **Step 1: Replace the `fill_density` block**

In `web/src/containers/laser/lib/settings/svg.json`, find the `fill_density` entry inside `config.children.fill.children`. It currently reads:

```json
          "fill_density": {
            "label": "Fill Density",
            "description": "Fill Density description",
            "default_value": 4,
            "type": "int",
            "minimum_value": 1,
            "maximum_value": 10
          }
```

Replace with:

```json
          "fill_density": {
            "label": "Fill Density",
            "description": "Fill Density description",
            "default_value": 4,
            "type": "float",
            "precision": 1,
            "minimum_value": 0.5,
            "maximum_value": 10
          }
```

Preserve the surrounding JSON commas and indentation exactly.

- [ ] **Step 2: JSON syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/laser/lib/settings/svg.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add web/src/containers/laser/lib/settings/svg.json
git commit -m "allow fractional fill density in laser svg settings"
```

---

### Task 3: Widen `fill_density` schema in writeAndDraw svg settings

**Files:**
- Modify: `web/src/containers/writeAndDraw/lib/settings/svg.json`

- [ ] **Step 1: Replace the `fill_density` block**

In `web/src/containers/writeAndDraw/lib/settings/svg.json`, find the `fill_density` entry inside `config.children.fill.children`. It currently reads:

```json
          "fill_density": {
            "label": "Fill Density",
            "description": "Fill Density description",
            "default_value": 4,
            "type": "int",
            "minimum_value": 1,
            "maximum_value": 10
          }
```

Replace with:

```json
          "fill_density": {
            "label": "Fill Density",
            "description": "Fill Density description",
            "default_value": 4,
            "type": "float",
            "precision": 1,
            "minimum_value": 0.5,
            "maximum_value": 10
          }
```

Preserve the surrounding JSON commas and indentation exactly.

- [ ] **Step 2: JSON syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/writeAndDraw/lib/settings/svg.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add web/src/containers/writeAndDraw/lib/settings/svg.json
git commit -m "allow fractional fill density in draw svg settings"
```

---

### Task 4: Thread `precision` through laser ConfigSvg NumberInput

**Files:**
- Modify: `web/src/containers/laser/ui/Config/ConfigSvg.jsx`

- [ ] **Step 1: Add the precision prop**

In `web/src/containers/laser/ui/Config/ConfigSvg.jsx`, find the `NumberInput` for fill density (around lines 77–81):

```jsx
                            <NumberInput
                                min={fill_density.minimum_value}
                                max={fill_density.maximum_value}
                                value={fill_density.default_value}
                                onAfterChange={actions.setFillDensity}/>
```

Insert a `precision` prop between `value` and `onAfterChange`:

```jsx
                            <NumberInput
                                min={fill_density.minimum_value}
                                max={fill_density.maximum_value}
                                value={fill_density.default_value}
                                precision={fill_density.precision}
                                onAfterChange={actions.setFillDensity}/>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/containers/laser/ui/Config/ConfigSvg.jsx
git commit -m "pass precision to laser fill density input"
```

---

### Task 5: Thread `precision` through writeAndDraw ConfigSvg NumberInput

**Files:**
- Modify: `web/src/containers/writeAndDraw/ui/Config/ConfigSvg.jsx`

- [ ] **Step 1: Add the precision prop**

In `web/src/containers/writeAndDraw/ui/Config/ConfigSvg.jsx`, find the `NumberInput` for fill density (same position as in the laser copy). It reads:

```jsx
                            <NumberInput
                                min={fill_density.minimum_value}
                                max={fill_density.maximum_value}
                                value={fill_density.default_value}
                                onAfterChange={actions.setFillDensity}/>
```

Insert a `precision` prop between `value` and `onAfterChange`:

```jsx
                            <NumberInput
                                min={fill_density.minimum_value}
                                max={fill_density.maximum_value}
                                value={fill_density.default_value}
                                precision={fill_density.precision}
                                onAfterChange={actions.setFillDensity}/>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/containers/writeAndDraw/ui/Config/ConfigSvg.jsx
git commit -m "pass precision to draw fill density input"
```

---

### Task 6: Rebuild the web container and scan for build errors

**Files:** none (build/runtime validation)

- [ ] **Step 1: Rebuild the web image**

Run from repo root: `docker compose build web 2>&1 | tail -5`
Expected: last line is `Image rotrics-studio-app-web Built`.

- [ ] **Step 2: Scan for errors/warnings introduced by this change**

Run: `docker compose build web 2>&1 | grep -iE "error|fail" | grep -viE "eslint|deprecat"`
Expected: no lines. (Asset-size warnings are pre-existing and filtered.)

If any error line appears, stop and diagnose before proceeding.

- [ ] **Step 3: Restart the running container**

Run: `docker compose up -d web 2>&1 | tail -3`
Expected: `Container rotrics-studio-app-web-1 Started`.

- [ ] **Step 4: No commit (validation only)**

---

### Task 7: Manual end-to-end verification

**Files:** none (manual verification)

Use the fixture SVG at `/home/bmagyar/workspaces/leather-brand/cairn-logo-triple-bar.svg`. Before uploading, convert the `<text>` element to paths in Inkscape so text isn't confounding this feature: open the SVG → Select the text → `Path → Object to Path` (Ctrl+Shift+C) → Save as a new file or overwrite. If not convenient, any SVG with filled `<rect>` or `<path fill="…">` elements will exercise the hatcher — the CAIRN bars are sufficient even without the wordmark.

- [ ] **Step 1: Open the laser tab at `http://localhost:8080`, upload the SVG (via the SVG button)**

Verify: model renders with filled rectangles visible in the canvas preview.

- [ ] **Step 2: Enable fill, step through fractional densities**

Toggle the Fill checkbox ON in the SVG config panel. Change `fill_density`:

- `fill_density = 0.5` — preview shows hatching at ~2 mm spacing inside each filled rectangle.
- `fill_density = 1.5` — ~0.67 mm spacing. (This value was impossible under the old integer-only code.)
- `fill_density = 3` — 0.33 mm spacing, visually very similar to the old behaviour at integer density=3.
- `fill_density = 10` — dense packing; preview shows near-solid fill.

Each change should re-render the preview within a second or two.

- [ ] **Step 3: Generate and Export G-code at `fill_density = 1.5`**

Click Generate G-code → Export G-code. Open the exported file. Confirm:
- File is mostly `G1 X<…> Y<…>` lines with float X/Y values.
- Hatching rows step by ~0.67 mm in Y between scanlines.
- `M3 S<scaled>` and `M5` pairs wrap each G1 burst (matching the existing laser semantics).

- [ ] **Step 4: Regression — fill OFF**

Toggle Fill OFF. Preview shows outlines only (the rectangle edges). Generate G-code → Export — confirm output contains only the four edges per rectangle, no hatching.

- [ ] **Step 5: Draw module parity**

Switch to the Write/Draw tab, upload the same SVG, enable fill, set `fill_density = 1.5`. Confirm: the NumberInput accepts 1.5, preview renders, generated G-code uses pen up/down (`G0 Z<offset>` / `G1 Z0`) — hatching pattern matches what you saw in the laser tab.

- [ ] **Step 6: No commit (verification only)**

If any step fails, fix and commit the fix.

---

## Done criteria

- Tasks 1–5 committed on branch `svg-vector-fill`.
- Docker web build green (Task 6).
- Manual verification across laser and draw (Task 7) passes, or any bug found is fixed and committed.
- No edits outside the five files in the File Map.
