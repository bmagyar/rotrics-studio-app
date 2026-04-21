# Laser Framing-Power Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users trace the laser job boundary with the laser on at a user-set low power, so the outline is visible on the workpiece; preserve the existing dry-run boundary as default behaviour.

**Architecture:** Add a persistent global `laserFramingPower` (0–100, default 0) to `persistentData` localStorage state, parameterise `getGcode4runBoundary(framingPower, workSpeed)` in `reducers/laser.js` to emit M3 S<scaled>/M5 plus G1 moves at the given speed when power > 0, wire the laser Config's `runBoundary` action to read both values from Redux and the selected model, and add a `Framing Power (%)` slider beneath the existing Power slider in the laser Working Parameters panel.

**Tech Stack:** React, Redux (thunks), localStorage. No new deps.

**Spec:** `docs/superpowers/specs/2026-04-21-laser-framing-power-design.md`

**Testing reality check:** This repo has no unit-test runner wired into the web app. Syntax validation via `node -e` / `node --check` or the Docker build. Feature correctness is manually verified in the final task (load a bitmap, click Run Boundary at 0 and at 5, inspect generated G-code). Don't invent a test framework.

---

## File Map

**Modified (four files, all edits):**
- `web/src/reducers/persistentData.js` — add `LASER_FRAMING_POWER` constant, seed default, initial-state entry, `setLaserFramingPower` action.
- `web/src/reducers/laser.js` — make `getGcode4runBoundary` take `(framingPower, workSpeed)`; emit M3/M5 and G1 moves at `workSpeed` when `framingPower > 0`.
- `web/src/containers/laser/ui/Config/Index.jsx` — map `laserFramingPower` from `state.persistentData` into props; in `runBoundary` read framing power and the selected model's work speed, pass both to `getGcode4runBoundary`.
- `web/src/containers/laser/ui/Config/WorkingParameters.jsx` — import `persistentDataActions`; map `laserFramingPower` into props; add a new slider Row directly after the Power row.

**No new files.** No changes to the server, the gcode translator, the CSS, the settings JSON, or the writeAndDraw module.

---

### Task 1: Add framing-power state and persistence

**Files:**
- Modify: `web/src/reducers/persistentData.js`

Reference: the existing `WORK_HEIGHT.LASER` / `setWorkHeightLaser` pattern (lines 2–6, 27–29, 40–42, 67–70). Mirror it exactly.

- [ ] **Step 1: Add the new constant**

At the top of `web/src/reducers/persistentData.js`, find this block:

```js
export const WORK_HEIGHT_PLACE_HOLDER = 'WORK_HEIGHT_PLACE_HOLDER';
const IS_TOOLTIP_DISPLAYED = "IS_TOOLTIP_DISPLAYED";
const ADVANCE = 'ADVANCE';
const Z_PRESETS_KEY = 'Z_PRESETS';
```

Add a new export immediately below `WORK_HEIGHT_PLACE_HOLDER`:

```js
export const LASER_FRAMING_POWER = 'LASER_FRAMING_POWER';
```

- [ ] **Step 2: Seed default when null**

Find this block (around line 27–29):

```js
if (persistents.get(WORK_HEIGHT.LASER) === null) {
    persistents.set(WORK_HEIGHT.LASER, 0);
}
```

Add this block immediately below it:

```js
if (persistents.get(LASER_FRAMING_POWER) === null) {
    persistents.set(LASER_FRAMING_POWER, 0);
}
```

- [ ] **Step 3: Add to INITIAL_STATE**

Find the `INITIAL_STATE` object (around lines 39–47). It looks like:

```js
const INITIAL_STATE = {
    workHeightP3d: persistents.getFloat(WORK_HEIGHT.P3D),
    workHeightPen: persistents.getFloat(WORK_HEIGHT.PEN),
    workHeightLaser: persistents.getFloat(WORK_HEIGHT.LASER),
    isTooltipDisplayed: persistents.get(IS_TOOLTIP_DISPLAYED),
    // 高级模式
    advance: persistents.getFloat(ADVANCE),
    zPresets: JSON.parse(persistents.get(Z_PRESETS_KEY) || '[]')
};
```

Insert `laserFramingPower` directly after `workHeightLaser`:

```js
const INITIAL_STATE = {
    workHeightP3d: persistents.getFloat(WORK_HEIGHT.P3D),
    workHeightPen: persistents.getFloat(WORK_HEIGHT.PEN),
    workHeightLaser: persistents.getFloat(WORK_HEIGHT.LASER),
    laserFramingPower: persistents.getFloat(LASER_FRAMING_POWER),
    isTooltipDisplayed: persistents.get(IS_TOOLTIP_DISPLAYED),
    // 高级模式
    advance: persistents.getFloat(ADVANCE),
    zPresets: JSON.parse(persistents.get(Z_PRESETS_KEY) || '[]')
};
```

- [ ] **Step 4: Add the action**

Find `setWorkHeightLaser` (lines 67–70):

```js
    setWorkHeightLaser: (value) => (dispatch, getState) => {
        dispatch(actions._updateState({workHeightLaser: value}));
        persistents.set(WORK_HEIGHT.LASER, value);
    },
```

Add a new action directly below it:

```js
    setLaserFramingPower: (value) => (dispatch, getState) => {
        dispatch(actions._updateState({laserFramingPower: value}));
        persistents.set(LASER_FRAMING_POWER, value);
    },
```

- [ ] **Step 5: Syntax check**

Run: `node --check web/src/reducers/persistentData.js`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add web/src/reducers/persistentData.js
git commit -m "add persistent laserFramingPower state"
```

---

### Task 2: Parameterise `getGcode4runBoundary`

**Files:**
- Modify: `web/src/reducers/laser.js`

- [ ] **Step 1: Change signature and body**

In `web/src/reducers/laser.js`, find `getGcode4runBoundary` (lines 29–59). The current implementation reads:

```js
const getGcode4runBoundary = () => {
    const min = -Number.MAX_VALUE;
    const max = Number.MAX_VALUE;
    let _minX = max, _minY = max;
    let _maxX = min, _maxY = min;
    for (let i = 0; i < rendererParent.children.length; i++) {
        const model = rendererParent.children[i];
        const {toolPathLines, settings} = model;
        const {minX, maxX, minY, maxY} = computeBoundary(toolPathLines, settings);
        _minX = Math.min(minX, _minX);
        _maxX = Math.max(maxX, _maxX);
        _minY = Math.min(minY, _minY);
        _maxY = Math.max(maxY, _maxY);
    }
    const p1 = {x: _minX.toFixed(1), y: _minY.toFixed(1)};
    const p2 = {x: _maxX.toFixed(1), y: _minY.toFixed(1)};
    const p3 = {x: _maxX.toFixed(1), y: _maxY.toFixed(1)};
    const p4 = {x: _minX.toFixed(1), y: _maxY.toFixed(1)};
    const gcodeArr = [];
    gcodeArr.push("M2000");
    gcodeArr.push("G0 F2000");
    gcodeArr.push(`G0 X${p1.x} Y${p1.y}`);
    // gcodeArr.push("M3 S255");
    gcodeArr.push(`G0 X${p2.x} Y${p2.y}`);
    gcodeArr.push(`G0 X${p3.x} Y${p3.y}`);
    gcodeArr.push(`G0 X${p4.x} Y${p4.y}`);
    gcodeArr.push(`G0 X${p1.x} Y${p1.y}`);
    // gcodeArr.push("M5");
    const gcode = gcodeArr.join("\n") + "\n";
    return gcode;
};
```

Replace the entire function with:

```js
const getGcode4runBoundary = (framingPower = 0, workSpeed = 1500) => {
    const min = -Number.MAX_VALUE;
    const max = Number.MAX_VALUE;
    let _minX = max, _minY = max;
    let _maxX = min, _maxY = min;
    for (let i = 0; i < rendererParent.children.length; i++) {
        const model = rendererParent.children[i];
        const {toolPathLines, settings} = model;
        const {minX, maxX, minY, maxY} = computeBoundary(toolPathLines, settings);
        _minX = Math.min(minX, _minX);
        _maxX = Math.max(maxX, _maxX);
        _minY = Math.min(minY, _minY);
        _maxY = Math.max(maxY, _maxY);
    }
    const p1 = {x: _minX.toFixed(1), y: _minY.toFixed(1)};
    const p2 = {x: _maxX.toFixed(1), y: _minY.toFixed(1)};
    const p3 = {x: _maxX.toFixed(1), y: _maxY.toFixed(1)};
    const p4 = {x: _minX.toFixed(1), y: _maxY.toFixed(1)};
    const gcodeArr = [];
    gcodeArr.push("M2000");
    if (framingPower > 0) {
        const scaledPower = Math.floor(framingPower * 255 / 100);
        gcodeArr.push(`G0 F2000 X${p1.x} Y${p1.y}`);
        gcodeArr.push(`M3 S${scaledPower}`);
        gcodeArr.push(`G1 F${workSpeed} X${p2.x} Y${p2.y}`);
        gcodeArr.push(`G1 X${p3.x} Y${p3.y}`);
        gcodeArr.push(`G1 X${p4.x} Y${p4.y}`);
        gcodeArr.push(`G1 X${p1.x} Y${p1.y}`);
        gcodeArr.push("M5");
    } else {
        gcodeArr.push("G0 F2000");
        gcodeArr.push(`G0 X${p1.x} Y${p1.y}`);
        gcodeArr.push(`G0 X${p2.x} Y${p2.y}`);
        gcodeArr.push(`G0 X${p3.x} Y${p3.y}`);
        gcodeArr.push(`G0 X${p4.x} Y${p4.y}`);
        gcodeArr.push(`G0 X${p1.x} Y${p1.y}`);
    }
    const gcode = gcodeArr.join("\n") + "\n";
    return gcode;
};
```

Key semantics to preserve:
- `framingPower = 0` path emits **exactly the same gcode as the current code** — rapid `G0 F2000`, four bare `G0 X… Y…` moves, no M3/M5. Verify this against the original by eye.
- `framingPower > 0` path: rapid to p1 with laser off, turn laser on, four `G1` moves at `workSpeed` (F emitted on the first G1 so subsequent moves inherit, matching the existing pattern of a single F declaration at the top), turn laser off.
- Default parameter values mean callers from any old place that still invoke `getGcode4runBoundary()` behave as before (dry-run, safe speed). We update the only caller in Task 3.

- [ ] **Step 2: Syntax check**

Run: `node --check web/src/reducers/laser.js`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add web/src/reducers/laser.js
git commit -m "parameterise getGcode4runBoundary with framing power and work speed"
```

---

### Task 3: Wire call site to pass framing power + work speed

**Files:**
- Modify: `web/src/containers/laser/ui/Config/Index.jsx`

- [ ] **Step 1: Update `mapStateToProps` to expose `laserFramingPower`**

Find the bottom of the file (around lines 198–206):

```js
const mapStateToProps = (state) => {
    const {gcode, model, modelCount, isAllPreviewed} = state.laser;
    return {
        gcode,
        model,
        isAllPreviewed,
        modelCount,
    };
};
```

Replace with:

```js
const mapStateToProps = (state) => {
    const {gcode, model, modelCount, isAllPreviewed} = state.laser;
    const {laserFramingPower} = state.persistentData;
    return {
        gcode,
        model,
        isAllPreviewed,
        modelCount,
        laserFramingPower,
    };
};
```

- [ ] **Step 2: Update `runBoundary` to pass the two new arguments**

Find `runBoundary` in the `actions` object (around lines 99–101):

```js
        runBoundary: () => {
            this.props.startTask(getGcode4runBoundary(), false)
        },
```

Replace with:

```js
        runBoundary: () => {
            const {model, laserFramingPower} = this.props;
            const workSpeed = model
                ? model.settings.working_parameters.children.work_speed.default_value
                : 1500;
            this.props.startTask(getGcode4runBoundary(laserFramingPower, workSpeed), false)
        },
```

- [ ] **Step 3: Syntax check**

Run: `node --check web/src/containers/laser/ui/Config/Index.jsx 2>&1 | head -5`

Note: `node --check` on JSX returns an error because JSX is not valid JS without babel. Expected output will start with `SyntaxError`. That's fine for this file — the real validation is the Docker build in Task 5. If you want stronger local confirmation, you can instead open the file and visually verify:
1. The `const {laserFramingPower} = state.persistentData;` destructure appears in `mapStateToProps` and the returned object includes `laserFramingPower`.
2. The `runBoundary` action reads `model` and `laserFramingPower` off `this.props` and passes them into `getGcode4runBoundary`.

- [ ] **Step 4: Commit**

```bash
git add web/src/containers/laser/ui/Config/Index.jsx
git commit -m "read laserFramingPower and pass work speed to boundary action"
```

---

### Task 4: Add the Framing Power slider to Working Parameters

**Files:**
- Modify: `web/src/containers/laser/ui/Config/WorkingParameters.jsx`

- [ ] **Step 1: Import persistentData actions**

At the top of the file, find the existing imports:

```js
import {actions as laserActions} from "../../../../reducers/laser";
```

Add this import immediately below:

```js
import {actions as persistentDataActions} from "../../../../reducers/persistentData";
```

- [ ] **Step 2: Add a setter action**

Find the `actions` object (around lines 58–88). It ends with:

```js
        //power
        setPower: (value) => {
            this.props.updateWorkingParameters("power", value)
        }
    };
```

Replace that closing block with:

```js
        //power
        setPower: (value) => {
            this.props.updateWorkingParameters("power", value)
        },
        setFramingPower: (value) => {
            this.props.setLaserFramingPower(value)
        }
    };
```

- [ ] **Step 3: Add the slider Row**

Find the Power Row (around lines 185–198):

```jsx
                    <Row
                        data-for={tooltipId}
                        data-tip={t(power.description)}>
                        <Col span={19}>
                            <ConfigText text={`${t(power.label)}(${power.unit})`}/>
                        </Col>
                        <Col span={5}>
                            <NumberInput
                                min={power.minimum_value}
                                max={power.maximum_value}
                                value={power.default_value}
                                onAfterChange={actions.setPower}/>
                        </Col>
                    </Row>
```

Add this Row immediately after it (before the `<Row data-for={tooltipId} data-tip={t(multi_pass.description)}>` block that currently follows):

```jsx
                    <Row
                        data-for={tooltipId}
                        data-tip={t('Power used while tracing the boundary. 0 = laser off (dry run).')}>
                        <Col span={19}>
                            <ConfigText text={`${t('Framing Power')}(%)`}/>
                        </Col>
                        <Col span={5}>
                            <NumberInput
                                min={0}
                                max={100}
                                value={this.props.laserFramingPower}
                                onAfterChange={actions.setFramingPower}/>
                        </Col>
                    </Row>
```

- [ ] **Step 4: Wire `laserFramingPower` through `mapStateToProps`**

Find `mapStateToProps` (around lines 246–253):

```js
const mapStateToProps = (state) => {
    const {model, working_parameters, config} = state.laser;
    return {
        model,
        working_parameters,
        config
    };
};
```

Replace with:

```js
const mapStateToProps = (state) => {
    const {model, working_parameters, config} = state.laser;
    const {laserFramingPower} = state.persistentData;
    return {
        model,
        working_parameters,
        config,
        laserFramingPower
    };
};
```

- [ ] **Step 5: Wire `setLaserFramingPower` through `mapDispatchToProps`**

Find `mapDispatchToProps` (around lines 255–259):

```js
const mapDispatchToProps = (dispatch) => {
    return {
        updateWorkingParameters: (key, value) => dispatch(laserActions.updateWorkingParameters(key, value)),
    };
};
```

Replace with:

```js
const mapDispatchToProps = (dispatch) => {
    return {
        updateWorkingParameters: (key, value) => dispatch(laserActions.updateWorkingParameters(key, value)),
        setLaserFramingPower: (value) => dispatch(persistentDataActions.setLaserFramingPower(value)),
    };
};
```

- [ ] **Step 6: Commit**

```bash
git add web/src/containers/laser/ui/Config/WorkingParameters.jsx
git commit -m "add framing power slider to laser working parameters"
```

---

### Task 5: Rebuild and validate the web container

**Files:** none (build/runtime validation)

- [ ] **Step 1: Rebuild the web image**

Run from the repo root: `docker compose build web 2>&1 | tail -10`

Expected: final line is `Image rotrics-studio-app-web Built`. No webpack errors in the output.

- [ ] **Step 2: Scan the full build output for errors**

Run: `docker compose build web 2>&1 | grep -iE "error|fail|warning" | grep -viE "eslint|deprecat"`

Expected: empty output.

If any line appears, stop and diagnose before proceeding.

- [ ] **Step 3: Recreate the running container**

Run: `docker compose up -d web`

Expected: `Container rotrics-studio-app-web-1 Recreated / Started`.

- [ ] **Step 4: No commit (validation only)**

---

### Task 6: Manual end-to-end verification

**Files:** none (runtime verification)

- [ ] **Step 1: Open the laser tab in the browser**

Navigate to `http://localhost:8080`, switch to the Laser tab. Load any bitmap (B&W PNG) and let the preview finish.

- [ ] **Step 2: Verify the slider exists and defaults to 0**

In the G-code right panel, expand to Working Parameters. Confirm:
- A new `Framing Power (%)` row appears directly below `Power (%)`.
- The value is `0`.
- Hovering shows the tooltip `Power used while tracing the boundary. 0 = laser off (dry run).`

- [ ] **Step 3: Run Boundary at 0 — dry run**

Click Run Boundary. Watch the head: it should trace the four corners of the model's bounding box with the laser off, matching the existing behaviour exactly.

- [ ] **Step 4: Verify persistence**

Set Framing Power to `5`. Reload the page (F5). Navigate back to the Laser tab and load a model. Confirm the slider still reads `5`.

- [ ] **Step 5: Run Boundary at 5 — marking**

Click Run Boundary. Verify:
- Head traces the same bounding box.
- Laser is visibly on at low power during the four corner moves.
- Motion is slower than the dry-run (because it's now using the model's work speed, ~400 mm/min for B&W defaults, rather than F2000).
- Laser turns off after the last corner.

- [ ] **Step 6: Inspect generated gcode by reading the socket payload (optional)**

There's no direct gcode export for Run Boundary in the UI; if you want to verify the exact string, add a temporary `console.log(gcode)` in `actions.runBoundary` (or inspect the websocket frame in browser devtools). Expected shape at Framing Power 5:

```
M2000
G0 F2000 X<minX> Y<minY>
M3 S12
G1 F<workSpeed> X<maxX> Y<minY>
G1 X<maxX> Y<maxY>
G1 X<minX> Y<maxY>
G1 X<minX> Y<minY>
M5
```

(`S12` = `Math.floor(5 * 255 / 100)`. `<workSpeed>` is whatever the model's Work Speed is currently set to.)

Expected shape at Framing Power 0 — identical to the previous production behaviour:

```
M2000
G0 F2000
G0 X<minX> Y<minY>
G0 X<maxX> Y<minY>
G0 X<maxX> Y<maxY>
G0 X<minX> Y<maxY>
G0 X<minX> Y<minY>
```

Remove the `console.log` after verifying.

- [ ] **Step 7: Verify engraving is unaffected**

Generate G-code and Export G-code for a small job. Confirm the exported file is unchanged in shape compared to pre-feature expectations (no new M3/M5 pairs injected, power value applied to engrave strokes is still the regular Power, not the framing value).

- [ ] **Step 8: No commit (verification only)**

If any verification step fails, fix before moving on to branch-finishing and commit the fix.

---

## Done criteria

- All four source tasks (1–4) committed on the `laser-framing-power` branch.
- Docker web build green.
- Manual verification in Task 6 all green (or failures fixed and committed).
- No modifications outside the four files listed in the File Map.
