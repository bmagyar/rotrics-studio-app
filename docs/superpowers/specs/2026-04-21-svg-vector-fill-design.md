# SVG Fill — Replace Rasterize-Then-Scan With Vector Scanline Hatching

## Problem

When a user uploads an SVG with **fill enabled**, the server-side `SVGFill.js` rasterises every shape into an in-memory pixel canvas sized `width_mm × fill_density` by `height_mm × fill_density`, then walks pixel rows to extract horizontal hatch segments. Consequences:

- Line spacing is quantised to integer multiples of `1/fill_density` mm. A user who finds `fill_density=3` too sparse and `fill_density=4` burns solid has no in-between setting.
- Preview line thickness doesn't match the physical laser kerf, so users calibrate by burning material rather than by reading the UI.
- The outline is rasterised then re-extracted, adding aliasing to what was a crisp vector boundary.

The rasterisation is an implementation choice, not a constraint: `SVGFill.js` already contains a correct scanline-polygon-intersection algorithm inside `fillShape`. It's just operating on integer pixel coordinates with canvas round-tripping. Removing the round-trip gives us true vector hatching for free.

## Goal

Replace the rasterise-then-scan fill path with a direct vector scanline hatcher that:

- Operates on float mm coordinates end-to-end.
- Accepts fractional `fill_density` values (minimum 0.5 dot/mm).
- Emits line segments straight into the toolpath with no canvas intermediate.

The existing fill-disabled path (pure outline) is already vector and unchanged.

## Scope

- **Server:** rewrite `server/src/toolPath/SVGFill.js`.
- **Client settings schema:** expand `fill_density` range and precision in `web/src/containers/laser/lib/settings/svg.json` and `web/src/containers/writeAndDraw/lib/settings/svg.json`.
- **Client UI:** thread a `precision` prop through the NumberInput in both copies of `ConfigSvg.jsx`.
- **Not touched:** `toolPathStr4svg.js` (already float-clean), `bw.json`/`greyscale.json` and their pipelines (inherently raster, unrelated), any reducer, any CSS.

Both laser and writeAndDraw benefit because both call the same server `toolPathStr4svg` → `svgToSegments` pipeline.

## Design

### Algorithm

New `svgToSegments`'s fill-enabled branch:

```
lineSpacing = 1 / fillDensity   // mm between hatch lines

for each visible shape:

    // 1. Emit outline as vector segments (preserves crisp boundary)
    for each path in shape:
        for each consecutive pair of points p_i, p_{i+1}:
            emit segment {start: p_i, end: p_{i+1}}

    if shape has no fill: continue

    // 2. Compute vertical extent across all closed sub-paths
    (minY, maxY) = bounding Y of all points in closed paths

    // 3. For each scanline Y from minY to maxY in lineSpacing steps:
    for y = minY; y <= maxY; y += lineSpacing:
        crossings = []
        for each edge (p1, p2) in each closed path:
            skip if edge is a duplicate point (x1==x2 && y1==y2)
            skip if edge is horizontal (y1==y2)
            use half-open interval [min(y1,y2), max(y1,y2)) to avoid double-count at shared vertices
            if y not in that interval: skip
            x = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            crossings.push(x)
        sort crossings ascending
        for i = 0; i + 1 < crossings.length; i += 2:
            emit segment {start: [crossings[i], y], end: [crossings[i+1], y]}
```

All arithmetic in float mm. Output segments feed directly into the existing `toolPathStr4svg` downstream, which already uses `Normalizer.x/y` on float mm — no API change.

### Fill rule

Even-odd semantics (pair crossings). This matches the current `fillShape` behaviour, which already uses even-odd implicitly. SVG's default is non-zero; for the geometric-logo use case driving this work, the two rules produce identical output. Switching to non-zero would require tracking edge direction and computing winding numbers — noted as a possible follow-up, not required here.

### Scanline ordering

Scanlines are emitted strictly top-to-bottom, X-crossings within a scanline strictly left-to-right. The current code does a boustrophedon (zig-zag) traversal across rows, which halves head travel. We lose that for now; the toolpath will have more pen-up moves between scanlines. If laser job times become a complaint, add a cheap row-reversal afterwards: reverse every other scanline's segment list. Out of scope for v1.

### Removed code

Following the replacement, delete from `SVGFill.js`:

- `mapPointToInteger`
- `drawPoint`
- `drawLine`
- `fillShape`
- `canvasToSegments`

These functions exist solely to support the canvas round-trip.

### Settings schema

Change in both `web/src/containers/laser/lib/settings/svg.json` and `web/src/containers/writeAndDraw/lib/settings/svg.json`, inside `config.children.fill.children.fill_density`:

- `type`: `"int"` → `"float"`
- Add `"precision": 1`
- `minimum_value`: `1` → `0.5`
- Keep `maximum_value: 10`, `default_value: 4`, `label`, `description`.

### UI wiring

In both `web/src/containers/laser/ui/Config/ConfigSvg.jsx` and `web/src/containers/writeAndDraw/ui/Config/ConfigSvg.jsx`, add one extra prop to the fill_density NumberInput:

```jsx
<NumberInput
    min={fill_density.minimum_value}
    max={fill_density.maximum_value}
    value={fill_density.default_value}
    precision={fill_density.precision}
    onAfterChange={actions.setFillDensity}/>
```

Backward-compatible: NumberInput's default `precision = 0` applies when the prop is `undefined`, so any other setting that doesn't carry a `precision` key continues to render as an integer input.

## Risks and limitations (v1)

- **Even-odd only.** Non-zero fill rule is not implemented. Complex SVG paths that rely on winding for holes may render as solid instead of with holes. Not observed on the logos driving this spec; flagged as future work.
- **Thin shapes may miss hatches.** A shape whose vertical extent is smaller than `lineSpacing` may get zero hatch lines. With `fill_density ≥ 1`, this means shapes thinner than 1 mm. Mitigation is "use higher density for fine detail," which users already do. Proper fix (snap the scan grid per-shape so each shape gets ≥ 1 scanline) is future work.
- **No boustrophedon ordering.** Head travel increases vs. the canvas-scanning predecessor. If this becomes a perceptible slowdown during jobs, add alternating reversal.
- **Outline-only fill rule edge cases.** For shapes where the SVG parser emits degenerate or zero-length edges, the current code has a `continue` guard. The new algorithm carries the equivalent `x1 === x2 && y1 === y2` guard. Watch for over-rejection on visual-companion edge cases; unlikely but flagged.

## Testing (manual)

The web app has no unit-test runner wired in. Validation steps:

1. **Server syntax check.** `node --check server/src/toolPath/SVGFill.js` — clean exit.
2. **Web container build.** `docker compose build web` — zero errors/warnings (excluding pre-existing asset-size warnings).
3. **End-to-end on the fixture.** Upload `~/workspaces/leather-brand/cairn-logo-triple-bar.svg` (with `<text>` pre-converted to paths in Inkscape). In the laser tab, turn fill ON:
   - `fill_density = 0.5` → 2 mm-spaced horizontal lines through each rectangle.
   - `fill_density = 1.5` → 0.67 mm spacing — a value that was impossible before.
   - `fill_density = 3` → 0.33 mm spacing — visually matches what the previous code produced at integer density.
4. **Preview parity.** The canvas preview after each density change matches the generated G-code (visually: same number of lines, same spacing).
5. **Regression: fill OFF** still emits only outlines.
6. **Draw module parity.** Repeat a single density change in the writeAndDraw tab and confirm fractional density is accepted.
7. **Export G-code inspection.** Generated file is all `G1` moves between float X/Y mm, one pair per hatch segment, laser M3/M5 toggling between scanlines.
