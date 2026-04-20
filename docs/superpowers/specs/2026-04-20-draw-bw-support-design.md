# Draw Module — B&W Bitmap Support

## Problem

The laser module accepts bitmap inputs (B&W and Greyscale) alongside SVG and Text. The writeAndDraw (pen/draw) module accepts only SVG and Text. Users cannot load a bitmap to draw with a pen, even though the server-side toolpath generator and the draw module's gcode translator already have the pieces needed to support it.

## Goal

Add B&W bitmap support to the draw module. Greyscale is out of scope for this change (a pen can't meaningfully vary intensity).

## What's already in place

- Server: `server/src/start-server.js` routes the `TOOL_PATH_GENERATE_WRITE_AND_DRAW` socket event through the same `generateToolPathLines(fileType, url, settings)` used by the laser module, so `"bw"` fileType is already accepted there.
- `web/src/containers/writeAndDraw/lib/toolPathLines2gcode.js` already translates `M3` → `G1 Z0` (pen down) and `M5` → `G0 Z<jog_pen_offset>` (pen up), so the laser-style toolpath is turned into pen commands automatically.
- `web/src/containers/writeAndDraw/ui/Config/styles.css` already defines `.btn_bw` and `.btn_greyscale` classes, and `web/src/containers/writeAndDraw/images/` already contains `bw.png` and `greyscale.png`.

So the work is limited to: one new settings JSON, one new config panel component, and wiring in three existing files.

## Design

### New files

1. **`web/src/containers/writeAndDraw/lib/settings/bw.json`**
   Based on `web/src/containers/laser/lib/settings/bw.json`, with:
   - `start_gcode.default_value` and `end_gcode.default_value` replaced with the values from `writeAndDraw/lib/settings/svg.json` (pen header `M888 P0`, no cover fan).
   - `transformation` block identical to laser's.
   - `config.children` keeps `invert`, `bw` (threshold), `line_direction`, `density`. The only numeric tweak: `density.maximum_value` is `10` (laser's is `20`); `density.default_value` stays `4`.
   - `working_parameters.children` contains only `work_speed` and `jog_speed`, with `default_value: 2000` (matching draw SVG defaults). Drop `dwell_time`, `engrave_time`, `power`, `multi_pass`.

2. **`web/src/containers/writeAndDraw/ui/Config/ConfigBW.jsx`**
   Clone of `web/src/containers/laser/ui/Config/ConfigBW.jsx`. Changes:
   - Import `actions as writeAndDrawActions` from `../../../../reducers/writeAndDraw` instead of laser.
   - `mapStateToProps` reads from `state.writeAndDraw`.
   - Render guard stays `model.fileType !== "bw"`.
   - Same four controls: Invert, Threshold, Density, Line Direction.

### Edited files

3. **`web/src/containers/writeAndDraw/lib/Model2D.js`**
   - Add `import settingsBw from "./settings/bw.json";` next to the existing `settingsSvg` import.
   - In the `getSizeRestriction` fileType switch, add `case "bw": settings = settingsBw; break;` before the `"svg"/"text"` case.
   - In the constructor's fileType switch, add `case "bw": this.settings = _.cloneDeep(settingsBw); break;` similarly.

4. **`web/src/reducers/writeAndDraw.js`**
   - In `addModel`, change the fileType whitelist from `["svg", "text"]` to `["bw", "svg", "text"]`.
   - Leave `isExampleAndInit = fileType === 'svg'` unchanged — bitmap uploads should not force the 80 mm example default; they use the natural sizing path via `getAvailableSize`, matching laser behaviour.

5. **`web/src/containers/writeAndDraw/ui/Config/Index.jsx`**
   - In `getAccept`, add a `case "bw"` returning `'.bmp, .gif, .jpeg, .jpg, .png'`.
   - Add a new upload button between the Example and SVG buttons (final order: Example, B&W, SVG, Text), styled with the existing `styles.btn_bw` class, labelled `t('B&W')`, calling `actions.onClickToUpload('bw')`.
   - Import the new `ConfigBW` component and render `<ConfigBW/>` alongside `<ConfigSvg/>` / `<ConfigSvgText/>` / `<Transformation/>` / `<WorkingParameters/>`.

### Not changed

- Server: no changes. `generateToolPathLines` already handles `fileType === "bw"` uniformly.
- `toolPathLines2gcode.js`: no changes. The M3/M5-to-Z translation already works.
- CSS and images: already present.

## Risks

- **Density at 10 dot/mm may still be too dense for some pens/paper.** Not a correctness issue — user can dial it down. Calling out so expectations are set.
- **Large bitmaps at coarse densities produce many pen-down / pen-up transitions.** The existing gcode translator handles every `M3`/`M5`. Performance has not been profiled; likely fine since laser already runs comparable volumes of commands.
- **Line direction "Diagonal"/"Diagonal2" untested for pens.** They use the same algorithm as laser; no reason to expect a functional difference, but worth including in manual testing.

## Testing (manual)

1. Open the draw tab, click the new B&W button, upload a PNG with clear black/white regions.
2. Confirm preview renders and the model becomes selected.
3. Adjust threshold, density, line direction, invert — confirm preview re-renders each time.
4. Generate G-code. Verify:
   - Starts with `M2000` and `M888 P0` (pen header).
   - Contains `G1 Z0` (pen down) and `G0 Z<jog_pen_offset>` (pen up) pairs — not `M3 S…`/`M5`.
   - No `power`/`dwell`/`multi-pass` related commands.
5. Load a second bitmap alongside the first; confirm `modelCount` increments and both preview.
6. Remove all models; confirm the panel resets.
