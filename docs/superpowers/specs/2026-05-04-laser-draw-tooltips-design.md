# Laser & Draw Config Tooltips — Real Descriptions

## Problem

Most fields in the laser and draw config panels show a placeholder string as their tooltip text — e.g. hovering "Fill Density" today shows literally `"Fill Density description"`. That's worse than no tooltip: it implies care was taken when none was. Real tooltip text exists for a handful of fields (Power, Threshold, Multi-Pass) but in inconsistent voice.

The tooltip plumbing is already in place: every config Row uses `data-tip={t(field.description)}` against a per-panel `<Tooltip/>` instance, which proxies `react-tooltip`. The only thing missing is good text on the `description` strings in the settings JSONs.

## Goal

Replace placeholder descriptions with real, concise English sentences across the laser and draw config panels — and unify the voice on the few fields that already have real text. English-only for now; translations to non-English locales (via `web/i18n.xlsx`) are out of scope.

## Style rules

- One sentence per field. No second-sentence usage tips.
- State what the field does. Include units when there is one (mm, mm/min, ms, %, etc.).
- Use the codebase's own vocabulary: "fill" not "hatch", "engrave" for laser, "draw" or "stroke" for pen.
- Don't restate min/max ranges that the spinner already shows, except when there's a non-obvious nuance — e.g. that `fill_density` now accepts fractions.
- ASCII apostrophes and hyphens, not unicode variants. (The current corpus mixes both; this PR settles on ASCII.)
- Don't mention task-related context ("added in PR #X", "needed for the fill rewrite"). Tooltips outlive the work that motivates them.

## Files in scope

Eight settings JSONs:

- `web/src/containers/laser/lib/settings/svg.json`
- `web/src/containers/laser/lib/settings/bw.json`
- `web/src/containers/laser/lib/settings/greyscale.json`
- `web/src/containers/laser/lib/settings/config_text.json`
- `web/src/containers/writeAndDraw/lib/settings/svg.json`
- `web/src/containers/writeAndDraw/lib/settings/bw.json`
- `web/src/containers/writeAndDraw/lib/settings/config_text.json`
- `web/src/containers/writeAndDraw/lib/settings/write_and_draw.json`

No JSX, JS, CSS, or server changes.

## The rewrites

Most fields recur across multiple files (e.g. `width` appears in every transformation block). Where a field is identical across files, the same description applies.

### Top-level (`start_gcode`, `end_gcode`)

Applies to: laser & draw `svg.json`, `bw.json`, `greyscale.json` (laser only).

| Path | New description |
|---|---|
| `start_gcode` | `"G-code prepended to every generated job."` |
| `end_gcode` | `"G-code appended to every generated job."` |

### Categories (panel headers)

These render as panel titles, not row tooltips. The text rarely shows up via `data-tip`, but it gets translated by `t(label)` and used in headings, so it's worth a clean rewrite.

| Path | New description |
|---|---|
| `transformation` (in svg/bw/greyscale) | `"Position, size, and orientation of the model on the bed."` |
| `working_parameters` (in svg/bw/greyscale) | `"Speed, power, and pass settings used during the job."` |
| `config` in svg.json | `"Vector path settings."` |
| `config` in bw.json | `"Black-and-white engraving settings."` (laser) / `"Black-and-white drawing settings."` (draw) |
| `config` in greyscale.json | `"Greyscale engraving settings."` |
| `config` in config_text.json | `"Text rendering settings."` |

### Transformation children

Applies to: every `transformation.children` block in svg/bw/greyscale.

| Path | New description |
|---|---|
| `width` | `"Width of the model on the bed (mm)."` |
| `height` | `"Height of the model on the bed (mm)."` |
| `rotation` | `"Rotation of the model around its centre (degrees, counter-clockwise)."` |
| `x` | `"Horizontal position of the model centre (mm)."` |
| `y` | `"Vertical position of the model centre (mm)."` |
| `flip_model` | `"Mirror the model along an axis, or none."` |

`img_width` / `img_height` carry no `description` field and are not user-visible.

### Config children — `bw.json`

Applies to laser & draw `bw.json`.

| Path | New description |
|---|---|
| `config.children.invert` | `"Swap black and white before processing."` |
| `config.children.bw` (Threshold) | `"Pixels darker than this value are treated as black (0–255)."` |
| `config.children.line_direction` | `"Direction of the parallel fill lines."` |
| `config.children.density` | `"Fill lines per millimetre."` |

### Config children — `greyscale.json` (laser only)

| Path | New description |
|---|---|
| `config.children.invert` | `"Swap black and white before processing."` |
| `config.children.contrast` | `"Spread between dark and light tones."` |
| `config.children.brightness` | `"Overall lightness of the engraved image."` |
| `config.children.white_clip` | `"Pixels lighter than this value are treated as pure white (0–255)."` |
| `config.children.algorithm` | `"Dithering algorithm used to convert greyscale to dots."` |
| `config.children.movement_mode` | `"Engrave one continuous line per row, or one dot per pixel."` |
| `config.children.density` | `"Engraving lines or dots per millimetre."` |
| `config.children.line_direction` | `"Direction of the parallel engraving lines."` |

`bw` (the inner default-only entry, no UI) keeps its current minimal shape.

### Config children — `svg.json`

Applies to laser & draw `svg.json`.

| Path | New description |
|---|---|
| `config.children.optimize_path` | `"Reorder paths to reduce travel between strokes."` |
| `config.children.fill` | `"Fill closed shapes with parallel lines."` |
| `config.children.fill.children.fill_density` | `"Fill lines per millimetre; accepts fractions."` |

### Config children — `config_text.json`

Applies to laser & draw `config_text.json`.

| Path | New description |
|---|---|
| `children.text` | `"Text content to engrave."` (laser) / `"Text content to draw."` (draw) |
| `children.font` | `"Font family used to render the text."` |
| `children.font_size` | `"Font size in points."` |

### Working parameters children

Applies to laser & draw `svg.json` and `bw.json`, plus laser `greyscale.json`.

| Path | New description |
|---|---|
| `working_parameters.children.work_speed` | `"Movement speed while working (mm/min)."` |
| `working_parameters.children.jog_speed` | `"Movement speed when not working (mm/min)."` |
| `working_parameters.children.dwell_time` | `"Pause before each laser-on pulse to stabilise the beam (ms)."` |
| `working_parameters.children.engrave_time` | `"Duration of each laser-on pulse in dot mode (ms)."` |
| `working_parameters.children.power` | `"Laser power output (%)."` |
| `working_parameters.children.multi_pass` | `"Run the G-code multiple times to reach deeper cuts."` |
| `working_parameters.children.multi_pass.children.passes` | `"Number of times to repeat the G-code."` |
| `working_parameters.children.multi_pass.children.pass_depth` | `"Lower the laser by this distance after each pass (mm)."` |

### writeAndDraw-only

| Path | New description |
|---|---|
| `web/src/containers/writeAndDraw/lib/settings/write_and_draw.json` `jog_pen_offset` | `"Pen lift height above the page when not drawing (mm)."` |

## Out of scope

- Updating `web/i18n.xlsx` translations. The new English strings are not yet keys in the spreadsheet, so `t()` will fall through to English in every locale. This is no worse than today (placeholders fell through to placeholders).
- Tooltips on the basic / teach_and_play / movement / accessories panels.
- Tooltips on UI elements that don't read from settings JSON (toolbar buttons, modals, etc.).
- The "UI help / tooltip audit" macro item from the wishlist — that broader pass remains as its own future brainstorm.

## Testing (manual)

1. `docker compose build web` — clean.
2. Open `http://localhost:8080`. Laser tab. Load any model. Hover each row in Working Parameters, Transformation, and the per-mode config panel — confirm tooltips show the new sentences.
3. Repeat in the Draw tab.
4. Sanity: hover a field that previously had real text (e.g. Power, Threshold). Confirm the new wording is what's in this spec.
5. Reload at a non-English locale (if one is selected via the i18n switcher). Confirm tooltips show the new English text — translations falling through is acceptable for v1.
