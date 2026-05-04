# Laser & Draw Config Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder `description` strings in eight settings JSONs with concise English sentences so the laser and draw config-panel tooltips show useful text.

**Architecture:** Pure text edits — no JSX, JS, CSS, or server changes. The tooltip plumbing already reads `description` via `t()` and renders through the existing `<Tooltip/>` infrastructure. Each task targets one JSON file with explicit old→new mappings.

**Tech Stack:** JSON only. No new deps. No code paths affected.

**Spec:** `docs/superpowers/specs/2026-05-04-laser-draw-tooltips-design.md`

**Testing reality check:** No unit-test runner. Validation per task is `node -e "JSON.parse(...)"` for parse. End-to-end visual check happens at the very end (Task 10): build the web container, hover each row in each config panel, eyeball the new wording.

---

## File Map

Eight JSON files modified, all under `web/src/containers/`:

- `laser/lib/settings/svg.json`
- `laser/lib/settings/bw.json`
- `laser/lib/settings/greyscale.json`
- `laser/lib/settings/config_text.json`
- `writeAndDraw/lib/settings/svg.json`
- `writeAndDraw/lib/settings/bw.json`
- `writeAndDraw/lib/settings/config_text.json`
- `writeAndDraw/lib/settings/write_and_draw.json`

No other files touched.

**Editing technique:** for every change, use the `Edit` tool with the exact `description` line as `old_string` and the rewritten line as `new_string`. JSON has no comments, so the `old_string` is just the line as it appears in the file (preserving leading whitespace). When two `description` lines in the same file are identical strings (which happens when a panel reuses a placeholder), use `replace_all: false` and provide the next unique surrounding context. The plan's table-form below already groups by canonical path, so the surrounding context is implicit — but if the implementer hits the "old_string not unique" error, they should expand `old_string` to include the preceding `"label"` line, which is always unique per field.

---

### Task 1: Rewrite `web/src/containers/laser/lib/settings/svg.json`

**Files:**
- Modify: `web/src/containers/laser/lib/settings/svg.json`

22 description lines. The current and new values:

| Line | Current | New |
|---|---|---|
| 4 | `"description": "Start Gcode description",` | `"description": "G-code prepended to every generated job.",` |
| 10 | `"description": "End Gcode description",` | `"description": "G-code appended to every generated job.",` |
| 18 | `"description": "Transformation B&W description",` | `"description": "Position, size, and orientation of the model on the bed.",` |
| 28 | `"description": "Width description",` | `"description": "Width of the model on the bed (mm).",` |
| 37 | `"description": "Height description",` | `"description": "Height of the model on the bed (mm).",` |
| 46 | `"description": "Rotation description",` | `"description": "Rotation of the model around its centre (degrees, counter-clockwise).",` |
| 55 | `"description": "Move X description",` | `"description": "Horizontal position of the model centre (mm).",` |
| 64 | `"description": "Move Y description",` | `"description": "Vertical position of the model centre (mm).",` |
| 73 | `"description": "Flip Model description",` | `"description": "Mirror the model along an axis, or none.",` |
| 89 | `"description": "Config of Vector",` | `"description": "Vector path settings.",` |
| 93 | `"description": "Optimize Path description",` | `"description": "Reorder paths to reduce travel between strokes.",` |
| 101 | `"description": "Fill description",` | `"description": "Fill closed shapes with parallel lines.",` |
| 105 | `"description": "Fill Density description",` | `"description": "Fill lines per millimetre; accepts fractions.",` |
| 120 | `"description": "Working Parameters description",` | `"description": "Speed, power, and pass settings used during the job.",` |
| 124 | `"description": "Determines how fast the front end moves when it’s working.",` | `"description": "Movement speed while working (mm/min).",` |
| 134 | `"description": "Determines how fast the front end moves when it’s not working.",` | `"description": "Movement speed when not working (mm/min).",` |
| 145 | `"description": "Pause DexArm and wait before turning ON laser. It helps improve laser engraving quality.",` | `"description": "Pause before each laser-on pulse to stabilise the beam (ms).",` |
| 156 | `"description": "Determines how long the laser keeps on when it's engraving a dot.",` | `"description": "Duration of each laser-on pulse in dot mode (ms).",` |
| 167 | `"description": "Power to use when laser is working.",` | `"description": "Laser power output (%).",` |
| 177 | `"description": "When enabled, the Arm will run the G-code multiple times automatically according to the below settings. This feature helps you cut materials that can't be cut with only one pass.",` | `"description": "Run the G-code multiple times to reach deeper cuts.",` |
| 183 | `"description": "Determines how many times the printer will run the G-code automatically.",` | `"description": "Number of times to repeat the G-code.",` |
| 191 | `"description": "Determines how much the laser module will be lowered after each pass.",` | `"description": "Lower the laser by this distance after each pass (mm).",` |

- [ ] **Step 1: Apply each substitution above using `Edit`**

Use the exact line as `old_string` (including leading whitespace as it appears in the file) and the corresponding new line as `new_string`. Don't invent new content; copy from the table.

If you hit "old_string is not unique" (it shouldn't on this file but it can if a description happens to repeat across blocks), expand the `old_string` to include the preceding `"label"` line, e.g.:

```
"label": "Width",
"description": "Width description",
```

becomes:

```
"label": "Width",
"description": "Width of the model on the bed (mm).",
```

- [ ] **Step 2: JSON syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/laser/lib/settings/svg.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Verify exact 22 description lines remain**

Run: `grep -c '"description"' web/src/containers/laser/lib/settings/svg.json`
Expected: `22`.

- [ ] **Step 4: Commit**

```bash
git add web/src/containers/laser/lib/settings/svg.json
git commit -m "rewrite laser svg config descriptions"
```

---

### Task 2: Rewrite `web/src/containers/laser/lib/settings/bw.json`

**Files:**
- Modify: `web/src/containers/laser/lib/settings/bw.json`

23 description lines. Mappings:

| Line | Current | New |
|---|---|---|
| 4 | `"description": "Start Gcode description",` | `"description": "G-code prepended to every generated job.",` |
| 10 | `"description": "End Gcode description",` | `"description": "G-code appended to every generated job.",` |
| 18 | `"description": "Transformation B&W description",` | `"description": "Position, size, and orientation of the model on the bed.",` |
| 28 | `"description": "Width description",` | `"description": "Width of the model on the bed (mm).",` |
| 37 | `"description": "Height description",` | `"description": "Height of the model on the bed (mm).",` |
| 46 | `"description": "Rotation description",` | `"description": "Rotation of the model around its centre (degrees, counter-clockwise).",` |
| 55 | `"description": "Move X description",` | `"description": "Horizontal position of the model centre (mm).",` |
| 64 | `"description": "Move Y description",` | `"description": "Vertical position of the model centre (mm).",` |
| 73 | `"description": "Flip Model description",` | `"description": "Mirror the model along an axis, or none.",` |
| 89 | `"description": "Config of B&W",` | `"description": "Black-and-white engraving settings.",` |
| 93 | `"description": "Inverts black to white and vise versa.",` | `"description": "Swap black and white before processing.",` |
| 99 | `"description": "Set a threshold to make sure the pixel whose greyscale is less than the threshold to black.",` | `"description": "Pixels darker than this value are treated as black (0–255).",` |
| 107 | `"description": "Select the direction of the engraving path.",` | `"description": "Direction of the parallel fill lines.",` |
| 119 | `"description": "Determines how fine and smooth the engraved picture will be. The bigger this value is, the better quality you will get.",` | `"description": "Fill lines per millimetre.",` |
| 132 | `"description": "Working Parameters description",` | `"description": "Speed, power, and pass settings used during the job.",` |
| 136 | `"description": "Determines how fast the front end moves when it’s working.",` | `"description": "Movement speed while working (mm/min).",` |
| 146 | `"description": "Determines how fast the front end moves when it’s not working.",` | `"description": "Movement speed when not working (mm/min).",` |
| 157 | `"description": "Pause DexArm and wait before turning ON laser. It helps improve laser engraving quality.",` | `"description": "Pause before each laser-on pulse to stabilise the beam (ms).",` |
| 168 | `"description": "Determines how long the laser keeps on when it's engraving a dot.",` | `"description": "Duration of each laser-on pulse in dot mode (ms).",` |
| 179 | `"description": "Power to use when laser is working.",` | `"description": "Laser power output (%).",` |
| 189 | `"description": "When enabled, the Arm will run the G-code multiple times automatically according to the below settings. This feature helps you cut materials that can't be cut with only one pass.",` | `"description": "Run the G-code multiple times to reach deeper cuts.",` |
| 195 | `"description": "Determines how many times the printer will run the G-code automatically.",` | `"description": "Number of times to repeat the G-code.",` |
| 203 | `"description": "Determines how much the laser module will be lowered after each pass.",` | `"description": "Lower the laser by this distance after each pass (mm).",` |

- [ ] **Step 1: Apply each substitution using `Edit`**

Same technique as Task 1.

- [ ] **Step 2: JSON syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/laser/lib/settings/bw.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Confirm description line count**

Run: `grep -c '"description"' web/src/containers/laser/lib/settings/bw.json`
Expected: `23`.

- [ ] **Step 4: Commit**

```bash
git add web/src/containers/laser/lib/settings/bw.json
git commit -m "rewrite laser bw config descriptions"
```

---

### Task 3: Rewrite `web/src/containers/laser/lib/settings/greyscale.json`

**Files:**
- Modify: `web/src/containers/laser/lib/settings/greyscale.json`

27 description lines:

| Line | Current | New |
|---|---|---|
| 4 | `"description": "Start Gcode description",` | `"description": "G-code prepended to every generated job.",` |
| 10 | `"description": "End Gcode description",` | `"description": "G-code appended to every generated job.",` |
| 18 | `"description": "Transformation B&W description",` | `"description": "Position, size, and orientation of the model on the bed.",` |
| 28 | `"description": "Width description",` | `"description": "Width of the model on the bed (mm).",` |
| 37 | `"description": "Height description",` | `"description": "Height of the model on the bed (mm).",` |
| 46 | `"description": "Rotation description",` | `"description": "Rotation of the model around its centre (degrees, counter-clockwise).",` |
| 55 | `"description": "Move X description",` | `"description": "Horizontal position of the model centre (mm).",` |
| 64 | `"description": "Move Y description",` | `"description": "Vertical position of the model centre (mm).",` |
| 73 | `"description": "Flip Model description",` | `"description": "Mirror the model along an axis, or none.",` |
| 89 | `"description": "Config of Greyscale",` | `"description": "Greyscale engraving settings.",` |
| 93 | `"description": "Inverts black to white and vise versa.",` | `"description": "Swap black and white before processing.",` |
| 99 | `"description": "The difference between the lightest color and the darkest color.",` | `"description": "Spread between dark and light tones.",` |
| 107 | `"description": "The engraved picture is brighter when this value is bigger.",` | `"description": "Overall lightness of the engraved image.",` |
| 115 | `"description": "Set the threshold to turn the color that is not pure white into pure white.",` | `"description": "Pixels lighter than this value are treated as pure white (0–255).",` |
| 126 | `"description": "Choose an algorithm for image processing.",` | `"description": "Dithering algorithm used to convert greyscale to dots.",` |
| 142 | `"description": "Choose the movement mode",` | `"description": "Engrave one continuous line per row, or one dot per pixel.",` |
| 152 | `"description": "Determines how fine and smooth the engraved picture will be. The bigger this value is, the better quality you will get.",` | `"description": "Engraving lines or dots per millimetre.",` |
| 161 | `"description": "Line Direction description",` | `"description": "Direction of the parallel engraving lines.",` |
| 177 | `"description": "Working Parameters description",` | `"description": "Speed, power, and pass settings used during the job.",` |
| 181 | `"description": "Determines how fast the front end moves when it’s working.",` | `"description": "Movement speed while working (mm/min).",` |
| 191 | `"description": "Determines how fast the front end moves when it’s not working.",` | `"description": "Movement speed when not working (mm/min).",` |
| 202 | `"description": "Pause DexArm and wait before turning ON laser. It helps improve laser engraving quality.",` | `"description": "Pause before each laser-on pulse to stabilise the beam (ms).",` |
| 213 | `"description": "Determines how long the laser keeps on when it's engraving a dot.",` | `"description": "Duration of each laser-on pulse in dot mode (ms).",` |
| 224 | `"description": "Power to use when laser is working.",` | `"description": "Laser power output (%).",` |
| 234 | `"description": "When enabled, the Arm will run the G-code multiple times automatically according to the below settings. This feature helps you cut materials that can't be cut with only one pass.",` | `"description": "Run the G-code multiple times to reach deeper cuts.",` |
| 240 | `"description": "Determines how many times the printer will run the G-code automatically.",` | `"description": "Number of times to repeat the G-code.",` |
| 248 | `"description": "Determines how much the laser module will be lowered after each pass.",` | `"description": "Lower the laser by this distance after each pass (mm).",` |

- [ ] **Step 1: Apply each substitution using `Edit`**

- [ ] **Step 2: JSON syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/laser/lib/settings/greyscale.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Confirm line count**

Run: `grep -c '"description"' web/src/containers/laser/lib/settings/greyscale.json`
Expected: `27`.

- [ ] **Step 4: Commit**

```bash
git add web/src/containers/laser/lib/settings/greyscale.json
git commit -m "rewrite laser greyscale config descriptions"
```

---

### Task 4: Rewrite `web/src/containers/laser/lib/settings/config_text.json`

**Files:**
- Modify: `web/src/containers/laser/lib/settings/config_text.json`

4 description lines:

| Line | Current | New |
|---|---|---|
| 5 | `"description": "Config of Text",` | `"description": "Text rendering settings.",` |
| 9 | `"description": "text description",` | `"description": "Text content to engrave.",` |
| 15 | `"description": "Font description",` | `"description": "Font family used to render the text.",` |
| 21 | `"description": "Font Size description",` | `"description": "Font size in points.",` |

- [ ] **Step 1: Apply each substitution using `Edit`**

- [ ] **Step 2: JSON syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/laser/lib/settings/config_text.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add web/src/containers/laser/lib/settings/config_text.json
git commit -m "rewrite laser text config descriptions"
```

---

### Task 5: Rewrite `web/src/containers/writeAndDraw/lib/settings/svg.json`

**Files:**
- Modify: `web/src/containers/writeAndDraw/lib/settings/svg.json`

22 description lines. Same set as Task 1 — descriptions are identical between laser and draw SVG settings:

| Line | Current | New |
|---|---|---|
| 4 | `"description": "Start Gcode description",` | `"description": "G-code prepended to every generated job.",` |
| 10 | `"description": "End Gcode description",` | `"description": "G-code appended to every generated job.",` |
| 18 | `"description": "Transformation B&W description",` | `"description": "Position, size, and orientation of the model on the bed.",` |
| 28 | `"description": "Width description",` | `"description": "Width of the model on the bed (mm).",` |
| 37 | `"description": "Height description",` | `"description": "Height of the model on the bed (mm).",` |
| 46 | `"description": "Rotation description",` | `"description": "Rotation of the model around its centre (degrees, counter-clockwise).",` |
| 55 | `"description": "Move X description",` | `"description": "Horizontal position of the model centre (mm).",` |
| 64 | `"description": "Move Y description",` | `"description": "Vertical position of the model centre (mm).",` |
| 73 | `"description": "Flip Model description",` | `"description": "Mirror the model along an axis, or none.",` |
| 89 | `"description": "Config of Vector",` | `"description": "Vector path settings.",` |
| 93 | `"description": "Optimize Path description",` | `"description": "Reorder paths to reduce travel between strokes.",` |
| 101 | `"description": "Fill description",` | `"description": "Fill closed shapes with parallel lines.",` |
| 105 | `"description": "Fill Density description",` | `"description": "Fill lines per millimetre; accepts fractions.",` |
| 120 | `"description": "Working Parameters description",` | `"description": "Speed, power, and pass settings used during the job.",` |
| 124 | `"description": "Determines how fast the front end moves when it’s working.",` | `"description": "Movement speed while working (mm/min).",` |
| 134 | `"description": "Determines how fast the front end moves when it’s not working.",` | `"description": "Movement speed when not working (mm/min).",` |
| 145 | `"description": "Pause DexArm and wait before turning ON laser. It helps improve laser engraving quality.",` | `"description": "Pause before each laser-on pulse to stabilise the beam (ms).",` |
| 156 | `"description": "Determines how long the laser keeps on when it's engraving a dot.",` | `"description": "Duration of each laser-on pulse in dot mode (ms).",` |
| 167 | `"description": "Power to use when laser is working.",` | `"description": "Laser power output (%).",` |
| 177 | `"description": "When enabled, the Arm will run the G-code multiple times automatically according to the below settings. This feature helps you cut materials that can't be cut with only one pass.",` | `"description": "Run the G-code multiple times to reach deeper cuts.",` |
| 183 | `"description": "Determines how many times the printer will run the G-code automatically.",` | `"description": "Number of times to repeat the G-code.",` |
| 191 | `"description": "Determines how much the laser module will be lowered after each pass.",` | `"description": "Lower the laser by this distance after each pass (mm).",` |

- [ ] **Step 1: Apply each substitution using `Edit`**

- [ ] **Step 2: JSON syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/writeAndDraw/lib/settings/svg.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Confirm line count**

Run: `grep -c '"description"' web/src/containers/writeAndDraw/lib/settings/svg.json`
Expected: `22`.

- [ ] **Step 4: Commit**

```bash
git add web/src/containers/writeAndDraw/lib/settings/svg.json
git commit -m "rewrite draw svg config descriptions"
```

---

### Task 6: Rewrite `web/src/containers/writeAndDraw/lib/settings/bw.json`

**Files:**
- Modify: `web/src/containers/writeAndDraw/lib/settings/bw.json`

This file is the draw-tuned B&W settings (added in an earlier feature). It has only `work_speed` and `jog_speed` plus an inert `power` placeholder under `working_parameters` — fewer rows than the laser version. Description lines:

| Line | Current | New |
|---|---|---|
| 4 | `"description": "Start Gcode description",` | `"description": "G-code prepended to every generated job.",` |
| 10 | `"description": "End Gcode description",` | `"description": "G-code appended to every generated job.",` |
| 18 | `"description": "Transformation B&W description",` | `"description": "Position, size, and orientation of the model on the bed.",` |
| 28 | `"description": "Width description",` | `"description": "Width of the model on the bed (mm).",` |
| 37 | `"description": "Height description",` | `"description": "Height of the model on the bed (mm).",` |
| 46 | `"description": "Rotation description",` | `"description": "Rotation of the model around its centre (degrees, counter-clockwise).",` |
| 55 | `"description": "Move X description",` | `"description": "Horizontal position of the model centre (mm).",` |
| 64 | `"description": "Move Y description",` | `"description": "Vertical position of the model centre (mm).",` |
| 73 | `"description": "Flip Model description",` | `"description": "Mirror the model along an axis, or none.",` |
| 89 | `"description": "Config of B&W",` | `"description": "Black-and-white drawing settings.",` |
| 93 | `"description": "Inverts black to white and vise versa.",` | `"description": "Swap black and white before processing.",` |
| 99 | `"description": "Set a threshold to make sure the pixel whose greyscale is less than the threshold to black.",` | `"description": "Pixels darker than this value are treated as black (0–255).",` |
| 107 | `"description": "Select the direction of the engraving path.",` | `"description": "Direction of the parallel fill lines.",` |
| 119 | `"description": "Determines how fine and smooth the engraved picture will be. The bigger this value is, the better quality you will get.",` | `"description": "Fill lines per millimetre.",` |
| 132 | `"description": "Working Parameters description",` | `"description": "Speed, power, and pass settings used during the job.",` |
| 136 | `"description": "Determines how fast the front end moves when it's working.",` | `"description": "Movement speed while working (mm/min).",` |
| 146 | `"description": "Determines how fast the front end moves when it's not working.",` | `"description": "Movement speed when not working (mm/min).",` |

(Note: this file uses ASCII `'` rather than the unicode `’` that some others use — the substitutions account for both.)

- [ ] **Step 1: Apply each substitution using `Edit`**

- [ ] **Step 2: JSON syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/writeAndDraw/lib/settings/bw.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Confirm description line count**

Run: `grep -c '"description"' web/src/containers/writeAndDraw/lib/settings/bw.json`
Expected: `17`.

- [ ] **Step 4: Commit**

```bash
git add web/src/containers/writeAndDraw/lib/settings/bw.json
git commit -m "rewrite draw bw config descriptions"
```

---

### Task 7: Rewrite `web/src/containers/writeAndDraw/lib/settings/config_text.json`

**Files:**
- Modify: `web/src/containers/writeAndDraw/lib/settings/config_text.json`

4 description lines:

| Line | Current | New |
|---|---|---|
| 5 | `"description": "Config of Text",` | `"description": "Text rendering settings.",` |
| 9 | `"description": "text description",` | `"description": "Text content to draw.",` |
| 15 | `"description": "Font description",` | `"description": "Font family used to render the text.",` |
| 21 | `"description": "Font Size description",` | `"description": "Font size in points.",` |

(Differs from Task 4 in only one row: "engrave" → "draw" for the text content, since this is the pen module.)

- [ ] **Step 1: Apply each substitution using `Edit`**

- [ ] **Step 2: JSON syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/writeAndDraw/lib/settings/config_text.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add web/src/containers/writeAndDraw/lib/settings/config_text.json
git commit -m "rewrite draw text config descriptions"
```

---

### Task 8: Rewrite `web/src/containers/writeAndDraw/lib/settings/write_and_draw.json`

**Files:**
- Modify: `web/src/containers/writeAndDraw/lib/settings/write_and_draw.json`

1 description line:

| Line | Current | New |
|---|---|---|
| 4 | `"description": "Jog Pen Offset description",` | `"description": "Pen lift height above the page when not drawing (mm).",` |

- [ ] **Step 1: Apply the substitution using `Edit`**

- [ ] **Step 2: JSON syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/writeAndDraw/lib/settings/write_and_draw.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add web/src/containers/writeAndDraw/lib/settings/write_and_draw.json
git commit -m "rewrite draw jog pen offset description"
```

---

### Task 9: Docker web build validation

**Files:** none (build step)

- [ ] **Step 1: Rebuild the web image**

Run from repo root: `docker compose build web 2>&1 | tail -5`
Expected: last line is `Image rotrics-studio-app-web Built`.

- [ ] **Step 2: Scan for build errors**

Run: `docker compose build web 2>&1 | grep -iE "error|fail" | grep -viE "eslint|deprecat"`
Expected: no output. (Asset-size warnings are pre-existing.)

- [ ] **Step 3: Restart the running web container**

Run: `docker compose up -d web 2>&1 | tail -3`
Expected: `Container rotrics-studio-app-web-1 Started`.

- [ ] **Step 4: No commit (validation only)**

---

### Task 10: Manual verification

**Files:** none (visual check)

- [ ] **Step 1: Open the laser tab at `http://localhost:8080`**

Load any model (PNG, SVG, text). Hover each row in:
- Transformation panel — confirm Width / Height / Rotation / Move X / Move Y / Flip Model show the new sentences.
- The per-mode config panel (BW / Greyscale / Vector / Text) — confirm each row.
- Working Parameters — confirm Work Speed / Jog Speed / Dwell Time / Engrave Time / Power / Multi-Pass and its sub-rows.

Tooltips should appear within ~200 ms of hovering, with the new English sentences.

- [ ] **Step 2: Repeat in the Draw tab**

Same steps, with whichever modes the draw tab supports (BW, SVG, Text). Confirm the draw-specific phrasings ("Black-and-white drawing settings", "Text content to draw", "Pen lift height...").

- [ ] **Step 3: Sanity-check a previously-good tooltip**

Hover Power (laser) — confirm the new wording (`"Laser power output (%)."`) replaces the old (`"Power to use when laser is working."`).

- [ ] **Step 4: No commit (verification only)**

If any tooltip still shows placeholder text or fails to render, that's a bug — fix the corresponding JSON line and recommit.

---

## Done criteria

- Tasks 1–8 committed on branch `laser-draw-tooltips`.
- Docker web build green (Task 9).
- Manual verification (Task 10) shows all targeted rows rendering the new tooltips.
- No edits outside the eight files in the File Map.
