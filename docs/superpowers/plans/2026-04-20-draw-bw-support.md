# Draw Module — B&W Bitmap Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add B&W bitmap upload support to the draw module, mirroring the laser module's B&W flow but with pen-appropriate settings and gcode.

**Architecture:** Copy laser's B&W settings JSON into a new draw-specific file (tuned for pens), clone laser's `ConfigBW.jsx` into draw (pointing at the draw reducer), then wire the new `"bw"` fileType through `Model2D.js`, `reducers/writeAndDraw.js`, and the draw Config panel. Server and gcode-translation layers need no changes — they already handle `"bw"` fileType and convert laser M3/M5 commands into pen down/up Z moves.

**Tech Stack:** React, Redux, Three.js, existing draw-module infrastructure. No new deps.

**Spec:** `docs/superpowers/specs/2026-04-20-draw-bw-support-design.md`

**Testing reality check:** This repo has no unit-test runner wired into the web app (`web/package.json` scripts are start/build/i18n only). Verification for each task is "file parses / webpack dev server hot-reloads cleanly." Feature correctness is manually validated in Task 7 (load a PNG, inspect preview and generated gcode). Don't invent a test framework — that's outside scope.

---

## File Map

**New:**
- `web/src/containers/writeAndDraw/lib/settings/bw.json` — draw-tuned B&W settings schema
- `web/src/containers/writeAndDraw/ui/Config/ConfigBW.jsx` — B&W config panel (dispatches to `writeAndDrawActions`)

**Modified:**
- `web/src/containers/writeAndDraw/lib/Model2D.js` — import `settingsBw`, add `"bw"` cases to two switches
- `web/src/reducers/writeAndDraw.js` — add `"bw"` to fileType whitelist in `addModel`
- `web/src/containers/writeAndDraw/ui/Config/Index.jsx` — accept-types entry, B&W upload button, render `<ConfigBW/>`

**Untouched:** server, `toolPathLines2gcode.js`, CSS (`btn_bw` already exists), images (`bw.png` already exists).

---

### Task 1: Create `bw.json` settings file for the draw module

**Files:**
- Create: `web/src/containers/writeAndDraw/lib/settings/bw.json`

Reference: `web/src/containers/laser/lib/settings/bw.json` (source of truth for B&W schema) and `web/src/containers/writeAndDraw/lib/settings/svg.json` (source of truth for draw start/end gcode and default speeds).

- [ ] **Step 1: Write the new settings file**

Create `web/src/containers/writeAndDraw/lib/settings/bw.json` with exactly this content:

```json
{
  "start_gcode": {
    "label": "Start Gcode",
    "description": "Start Gcode description",
    "default_value": ";----------- Start Gcode -----------\nM2000 ;custom:line mode\nM888 P0 ;custom:header is write&draw\n;-----------------------------------",
    "type": "str"
  },
  "end_gcode": {
    "label": "End Gcode",
    "description": "End Gcode description",
    "default_value": ";----------- End Gcode -------------\n;-----------------------------------",
    "type": "str"
  },
  "transformation": {
    "icon": "base64xxx",
    "label": "Transformation",
    "type": "category",
    "description": "Transformation B&W description",
    "children": {
      "img_width": {
        "default_value": 0
      },
      "img_height": {
        "default_value": 0
      },
      "width": {
        "label": "Width",
        "description": "Width description",
        "default_value": 5,
        "type": "int",
        "unit": "mm",
        "minimum_value": 5,
        "maximum_value": 297
      },
      "height": {
        "label": "Height",
        "description": "Height description",
        "default_value": 5,
        "type": "int",
        "unit": "mm",
        "minimum_value": 5,
        "maximum_value": 210
      },
      "rotation": {
        "label": "Rotation",
        "description": "Rotation description",
        "default_value": 0,
        "type": "int",
        "unit": "degree",
        "minimum_value": -180,
        "maximum_value": 180
      },
      "x": {
        "label": "Move X",
        "description": "Move X description",
        "default_value": 0,
        "type": "int",
        "unit": "mm",
        "minimum_value": -350,
        "maximum_value": 350
      },
      "y": {
        "label": "Move Y",
        "description": "Move Y description",
        "default_value": 300,
        "type": "int",
        "unit": "mm",
        "minimum_value": 0,
        "maximum_value": 700
      },
      "flip_model": {
        "label": "Flip Model",
        "description": "Flip Model description",
        "default_value": "None",
        "type": "enum",
        "options": {
          "None": "None",
          "Vertical": "Vertical",
          "Horizontal": "Horizontal",
          "Both": "Both"
        }
      }
    }
  },
  "config": {
    "icon": "base64xxx",
    "label": "B&W",
    "type": "category",
    "description": "Config of B&W",
    "children": {
      "invert": {
        "label": "Invert",
        "description": "Inverts black to white and vise versa.",
        "default_value": false,
        "type": "bool"
      },
      "bw": {
        "label": "Threshold",
        "description": "Set a threshold to make sure the pixel whose greyscale is less than the threshold to black.",
        "default_value": 140,
        "type": "int",
        "minimum_value": 0,
        "maximum_value": 255
      },
      "line_direction": {
        "label": "Line Direction",
        "description": "Select the direction of the engraving path.",
        "default_value": "Horizontal",
        "type": "enum",
        "options": {
          "Horizontal": "Horizontal",
          "Vertical": "Vertical",
          "Diagonal": "Diagonal",
          "Diagonal2": "Diagonal2"
        }
      },
      "density": {
        "label": "Density",
        "description": "Determines how fine and smooth the engraved picture will be. The bigger this value is, the better quality you will get.",
        "default_value": 4,
        "type": "int",
        "unit": "dot/mm",
        "minimum_value": 1,
        "maximum_value": 10
      }
    }
  },
  "working_parameters": {
    "icon": "base64xxx",
    "label": "Working Parameters",
    "type": "category",
    "description": "Working Parameters description",
    "children": {
      "work_speed": {
        "label": "Work Speed",
        "description": "Determines how fast the front end moves when it’s working.",
        "placeholder": "#work_speed#",
        "default_value": 2000,
        "type": "int",
        "unit": "mm/min",
        "minimum_value": 10,
        "maximum_value": 4000
      },
      "jog_speed": {
        "label": "Jog Speed",
        "description": "Determines how fast the front end moves when it’s not working.",
        "placeholder": "#jog_speed#",
        "default_value": 2000,
        "type": "int",
        "unit": "mm/min",
        "minimum_value": 10,
        "maximum_value": 4000
      }
    }
  }
}
```

- [ ] **Step 2: Syntax check**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/src/containers/writeAndDraw/lib/settings/bw.json', 'utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add web/src/containers/writeAndDraw/lib/settings/bw.json
git commit -m "add draw-tuned b&w settings json"
```

---

### Task 2: Wire `settingsBw` into `Model2D.js`

**Files:**
- Modify: `web/src/containers/writeAndDraw/lib/Model2D.js`

Reference: `web/src/containers/laser/lib/Model2D.js` handles `"bw"` with the same switch structure — mirror it exactly.

- [ ] **Step 1: Add the import**

At the top of `web/src/containers/writeAndDraw/lib/Model2D.js`, find the existing line:

```js
import settingsSvg from "./settings/svg.json";
```

Add a new import immediately above it:

```js
import settingsBw from "./settings/bw.json";
```

- [ ] **Step 2: Add `"bw"` case to the `getSizeRestriction` switch**

Find the switch inside `getSizeRestriction` in `Model2D.js`. It currently has one case:

```js
    switch (fileType) {
        case "svg":
        case "text":
            settings = getSettingSvg() // settingsSvg;
            break;
    }
```

Replace with:

```js
    switch (fileType) {
        case "bw":
            settings = settingsBw;
            break;
        case "svg":
        case "text":
            settings = getSettingSvg() // settingsSvg;
            break;
    }
```

- [ ] **Step 3: Add `"bw"` case to the constructor's switch**

In the `Model2D` class constructor, find the switch that assigns `this.settings`:

```js
        switch (fileType) {
            case "svg":
            case "text":
                this.settings = getSettingSvg() //  _.cloneDeep(settingsSvg);
                break;
        }
```

Replace with:

```js
        switch (fileType) {
            case "bw":
                this.settings = _.cloneDeep(settingsBw);
                break;
            case "svg":
            case "text":
                this.settings = getSettingSvg() //  _.cloneDeep(settingsSvg);
                break;
        }
```

- [ ] **Step 4: Syntax check**

Run: `cd web && npx babel src/containers/writeAndDraw/lib/Model2D.js --presets=@babel/preset-env,@babel/preset-react --no-babelrc -o /tmp/Model2D.compiled.js 2>&1 | head -20`

Expected: Either clean output (no errors) or only stderr output containing the compiled file path. If `@babel/preset-env` isn't available, fall back to `node --check` on the file after stripping imports is not trivial — in that case visually re-read the diff and proceed; webpack dev server will surface any error at startup.

- [ ] **Step 5: Commit**

```bash
git add web/src/containers/writeAndDraw/lib/Model2D.js
git commit -m "wire settingsBw into draw Model2D"
```

---

### Task 3: Whitelist `"bw"` in the draw reducer

**Files:**
- Modify: `web/src/reducers/writeAndDraw.js`

- [ ] **Step 1: Update the fileType whitelist**

In `web/src/reducers/writeAndDraw.js`, find the `addModel` action. It currently starts:

```js
    addModel: (fileType, file) => async (dispatch, getState) => {
        // 选择示例
        if (!["svg", "text"].includes(fileType)) {
            return {type: null};
        }

        // 判断是否实例
        const isExampleAndInit = fileType === 'svg'
```

Change the whitelist line to:

```js
        if (!["bw", "svg", "text"].includes(fileType)) {
```

Leave `isExampleAndInit = fileType === 'svg'` as-is. Bitmap uploads use the natural `getAvailableSize` path, matching laser behaviour.

- [ ] **Step 2: Commit**

```bash
git add web/src/reducers/writeAndDraw.js
git commit -m "allow bw fileType in draw addModel"
```

---

### Task 4: Create `ConfigBW.jsx` for draw

**Files:**
- Create: `web/src/containers/writeAndDraw/ui/Config/ConfigBW.jsx`

Reference: `web/src/containers/laser/ui/Config/ConfigBW.jsx` — this file is a direct clone with the reducer import swapped.

- [ ] **Step 1: Write the file**

Create `web/src/containers/writeAndDraw/ui/Config/ConfigBW.jsx` with this content:

```jsx
import React, {PureComponent} from 'react';
import {Checkbox, Row, Col} from 'antd';
import NumberInput from '../../../../components/NumberInput/Index.jsx';
import Line from '../../../../components/Line/Index.jsx'
import {actions as writeAndDrawActions} from "../../../../reducers/writeAndDraw";
import {connect} from 'react-redux';
import {ConfigTitle, ConfigText, ConfigSelect} from "../../../../components/Config";
import {withTranslation} from 'react-i18next';
import Tooltip from '../../../Tooltip/Index.jsx';
import {getUuid} from '../../../../utils';

const tooltipId = getUuid();

class ConfigBW extends PureComponent {
    actions = {
        setInvert: (e) => {
            this.props.updateConfig("invert", e.target.checked)
        },
        setBW: (value) => {
            this.props.updateConfig("bw", value)
        },
        setDensity: (value) => {
            this.props.updateConfig("density", value)
        },
        setLineDirection: (value) => {
            this.props.updateConfig("line_direction", value)
        }
    };

    render() {
        const {t} = this.props;
        const {model, config} = this.props;
        if (!model || model.fileType !== "bw" || !config) {
            return null;
        }
        const actions = this.actions;
        const {invert, bw, line_direction, density} = config.children;

        const directionOptions = [];
        Object.keys(line_direction.options).forEach((key) => {
            const option = line_direction.options[key];
            directionOptions.push({label: key, value: option})
        });
        return (
            <div>
                <Tooltip
                    id={tooltipId}
                    place="left"
                   />
                <Line/>
                <div style={{
                    padding: "8px",
                }}>
                    <ConfigTitle text={t(config.label)}/>
                    <Row
                        data-for={tooltipId}
                        data-tip={t(invert.description)}>
                        <Col span={19}>
                            <ConfigText text={`${t(invert.label)}`}/>
                        </Col>
                        <Col span={5}>
                            <Checkbox checked={invert.default_value} onChange={actions.setInvert}/>
                        </Col>
                    </Row>
                    <Row
                        data-for={tooltipId}
                        data-tip={t(bw.description)}>
                        <Col span={19}>
                            <ConfigText text={`${t(bw.label)}`}/>
                        </Col>
                        <Col span={5}>
                            <NumberInput
                                min={bw.minimum_value}
                                max={bw.maximum_value}
                                value={bw.default_value}
                                onAfterChange={actions.setBW}/>
                        </Col>
                    </Row>
                    <Row
                        data-for={tooltipId}
                        data-tip={t(density.description)}>
                        <Col span={19}>
                            <ConfigText text={`${t(density.label)}(${density.unit})`}/>
                        </Col>
                        <Col span={5}>
                            <NumberInput
                                min={density.minimum_value}
                                max={density.maximum_value}
                                value={density.default_value}
                                onAfterChange={actions.setDensity}/>
                        </Col>
                    </Row>
                    <Row
                        data-for={tooltipId}
                        data-tip={t(line_direction.description)}>
                        <Col span={15}>
                            <ConfigText text={`${t(line_direction.label)}`}/>
                        </Col>
                        <Col span={9}>
                            <ConfigSelect options={directionOptions} value={line_direction.default_value}
                                          onChange={actions.setLineDirection}/>
                        </Col>
                    </Row>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state) => {
    const {model, config} = state.writeAndDraw;
    return {
        model,
        config
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        updateConfig: (key, value) => dispatch(writeAndDrawActions.updateConfig(key, value)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(ConfigBW));
```

Note: the laser version imports `Select`, `Divider`, and `styles` without using them — dropped here. `updateConfig` already exists on `writeAndDrawActions` and is used by the SVG and text panels, so nothing new needs to be exported from the reducer.

- [ ] **Step 2: Commit**

```bash
git add web/src/containers/writeAndDraw/ui/Config/ConfigBW.jsx
git commit -m "add ConfigBW panel for draw module"
```

---

### Task 5: Wire B&W into the draw `Config/Index.jsx`

**Files:**
- Modify: `web/src/containers/writeAndDraw/ui/Config/Index.jsx`

- [ ] **Step 1: Import `ConfigBW`**

Find the existing import:

```js
import ConfigSvg from './ConfigSvg.jsx';
```

Add directly above it:

```js
import ConfigBW from './ConfigBW.jsx';
```

- [ ] **Step 2: Handle `"bw"` in `getAccept`**

The current `getAccept` function only handles `"svg"` and `"text"`:

```js
const getAccept = (fileType) => {
    let accept = '';
    switch (fileType) {
        case "bw":
        case "greyscale":
            //TODO: .tiff读取报错
            // Error: read ECONNRESET
            //       at TCP.onStreamRead (internal/stream_base_commons.js:205:27)
            // accept = '.bmp, .gif, .jpeg, .jpg, .png, .tiff';
            accept = '.bmp, .gif, .jpeg, .jpg, .png';
            break;
        case "svg":
        case "text":
            accept = '.svg';
            break;
    }
    return accept;
};
```

(The `"bw"`/`"greyscale"` case is already present in the source — no change to `getAccept` is needed. Leave it alone and continue.)

- [ ] **Step 3: Add a B&W button to the upload row**

Find the `<Space direction={"horizontal"}>` row containing the Example/SVG/Text buttons. It looks like:

```jsx
                <Space direction={"horizontal"} style={{width: "100%", paddingLeft: "10px", paddingTop: "10px"}}
                       size={16}>
                    <button
                        className={styles.btn_select}
                        onClick={() => {
                            this.buildInSvgList.current.style.display = 'block'
                        }}
                    >
                        <h6 className={styles.h_file_type}>{t('Example')}</h6>
                    </button>
                    <button
                        className={styles.btn_svg}
                        onClick={() => actions.onClickToUpload('svg')}
                    >
                        <h6 className={styles.h_file_type}>{t('SVG')}</h6>
                    </button>
                    <button
                        className={styles.btn_text}
                        onClick={() => actions.onClickToUpload('text')}
                    >
                        <h6 className={styles.h_file_type}>{t('Text')}</h6>
                    </button>
                </Space>
```

Insert a new `<button>` between the Example and SVG buttons so the final order is Example → B&W → SVG → Text:

```jsx
                    <button
                        className={styles.btn_bw}
                        onClick={() => {
                            this.buildInSvgList.current.style.display = 'none';
                            actions.onClickToUpload('bw');
                        }}
                    >
                        <h6 className={styles.h_file_type}>{t('B&W')}</h6>
                    </button>
```

Why the inline `buildInSvgList` hide: the Example list is a togglable overlay; clicking any other upload button should dismiss it. The existing `onClickToUpload` already dismisses it for non-text types (line 64), so the inline `none` assignment is belt-and-suspenders consistency with the Example button. It is safe because `this.buildInSvgList.current` is always attached by the time the click fires.

- [ ] **Step 4: Render `<ConfigBW/>`**

Find the block at the bottom of the render that currently reads:

```jsx
                <ConfigSvg/>
                <ConfigSvgText/>
                <Transformation/>
                <WorkingParameters/>
```

Replace with:

```jsx
                <ConfigBW/>
                <ConfigSvg/>
                <ConfigSvgText/>
                <Transformation/>
                <WorkingParameters/>
```

- [ ] **Step 5: Commit**

```bash
git add web/src/containers/writeAndDraw/ui/Config/Index.jsx
git commit -m "expose b&w upload button and panel in draw config"
```

---

### Task 6: Start the app and verify it loads

**Files:** none (runtime verification only)

- [ ] **Step 1: Start the server**

In one terminal: `cd server && npm start`

Expected: server listens on the configured port (check console output for `listening on` or similar).

- [ ] **Step 2: Start the web dev server**

In another terminal: `cd web && npm start`

Expected: webpack-dev-server compiles cleanly and serves on its port (typically 8080). If compilation fails, read the error — most likely an import path typo or a JSON syntax error from Task 1; fix in place and let HMR recompile.

- [ ] **Step 3: Open the draw tab in the browser**

Navigate to the app, switch to the Write/Draw tab. Expected: four upload buttons visible — Example, B&W, SVG, Text — in that order. The B&W button shows the existing `bw.png` icon (same icon the laser tab uses).

- [ ] **Step 4: Commit (no file changes, skip)**

No commit needed; this is a verification step.

---

### Task 7: Manual end-to-end verification

**Files:** none (runtime verification only)

Use any test PNG with clear black regions on white (e.g. a logo screenshot).

- [ ] **Step 1: Load a bitmap**

Click the B&W button. Pick a PNG. Expected:
- File dialog accepts `.bmp/.gif/.jpg/.jpeg/.png`.
- Model appears on the canvas with natural aspect ratio.
- Selected-model state updates (Transformation panel shows width/height).
- Preview renders (model shows hatched lines inside black regions).

- [ ] **Step 2: Exercise the B&W config panel**

In the right panel, confirm four controls appear under a "B&W" heading: Invert, Threshold, Density, Line Direction.

Change each one and confirm the preview re-renders:
- Invert: swap black ↔ white interpretation.
- Threshold: slide up and down — more/less area becomes "black."
- Density: try 2 and 8 — lines get further apart / closer together.
- Line Direction: try Vertical and Diagonal — hatch orientation changes.

- [ ] **Step 3: Generate and inspect gcode**

Click "Generate G-code" → "Export G-code" and save the file. Open it in a text editor. Confirm:
- Starts with `M2000` followed by `M888 P0 ;custom:header is write&draw` (the draw-pen header, not the laser `M888 P1`).
- Contains repeated `G1 Z0` (pen down) and `G0 Z<jog_pen_offset>` (pen up) pairs. The `<jog_pen_offset>` value comes from the existing `write_and_draw.json` setting — typically 10.
- Does NOT contain `M3 S…`, `M5`, or any reference to laser power.
- Does NOT contain dwell/engrave-time/multi-pass commands.

- [ ] **Step 4: Multi-model smoke test**

Without removing the first bitmap, add a second bitmap (or an SVG). Expected:
- Both models render.
- `modelCount` displayed/used by the toolbar reflects 2.
- Selecting each populates its own config panel correctly.

- [ ] **Step 5: Clear and re-load**

Click the Clear button. Expected: all models removed, config panels blank. Add a bitmap again; confirm the full flow still works after a clear.

- [ ] **Step 6: Commit (no file changes)**

No commit needed. If this task surfaces a defect, fix it and commit that fix.

---

## Done criteria

- All six prior tasks' commits on the `draw-bw-support` branch.
- Task 7 end-to-end check passes without issues (or any issue found is fixed and committed).
- No changes to laser-module files, server code, `toolPathLines2gcode.js`, CSS, or images.
