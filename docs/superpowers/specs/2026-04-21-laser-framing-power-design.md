# Laser Module — Framing at Low Power

## Problem

Positioning the workpiece before starting a laser job is imprecise. The existing "Run Boundary" button moves the head around the bounding box of the model(s) with the laser off, so users can watch the head overhead but cannot see where the beam will actually land. For opaque materials or busy workspaces this isn't reliable.

## Goal

Let the user trace the boundary with the laser on at a user-controllable low power, so the outline is faintly visible on the workpiece without damaging material. Preserve the existing dry-run behaviour as the default.

## User-facing shape

One existing button: **Run Boundary** (unchanged position, unchanged name).

One new slider in the laser Working Parameters panel, positioned directly below the Power slider: **Framing Power (%)**, range `0–100`, default `0`.

- **Framing Power = 0** → Run Boundary behaves exactly as today (laser off, rapid moves).
- **Framing Power > 0** → Run Boundary turns the laser on at that power level, moves at the selected model's work speed so the outline is actually visible, then turns the laser off.

The value persists across page reloads via `localStorage` (mirroring `workHeightLaser`).

## Design

### State and persistence

Follow the `workHeightLaser` pattern in `web/src/reducers/persistentData.js`:

- Add constant `export const LASER_FRAMING_POWER = 'LASER_FRAMING_POWER';` at the top.
- Seed default: if the key is null at load, set it to `0`.
- Add `laserFramingPower: persistents.getFloat(LASER_FRAMING_POWER)` to `INITIAL_STATE`.
- Add a thunk action `setLaserFramingPower(value)` that dispatches `_updateState({ laserFramingPower: value })` and calls `persistents.set(LASER_FRAMING_POWER, value)`.

Stored and in-memory value is `0–100` (integer). Scaling to S-value is done at gcode-generation time, not in storage.

### `getGcode4runBoundary` signature change

File: `web/src/reducers/laser.js`.

Change from `const getGcode4runBoundary = () => { … }` to `const getGcode4runBoundary = (framingPower, workSpeed) => { … }`.

Behaviour:

- `framingPower === 0`: identical to today — `M2000`, `G0 F2000`, four `G0 X… Y…` corner moves, terminating newline. No `M3`/`M5` (same as the existing commented-out lines imply).
- `framingPower > 0`: 
  - `M2000`
  - `G0 X<minX> Y<minY>` (rapid to the first corner with laser off)
  - `M3 S<scaled>` where `<scaled> = Math.floor(framingPower * 255 / 100)`
  - Four `G1 X<…> Y<…> F<workSpeed>` corner moves (first corner move carries the F value; subsequent moves can inherit, but we emit F on every line for robustness, matching the existing pattern of `G0 F2000` once then bare `G0` moves — we'll likewise emit `G1 F<workSpeed>` once and then bare `G1` moves)
  - `M5`
  - terminating newline

If no models are loaded, the function already returns garbage (`±Infinity` bounding box). Out of scope to fix.

### Call site

File: `web/src/containers/laser/ui/Config/Index.jsx`, `actions.runBoundary` at line 99–101.

Current:

```js
runBoundary: () => {
    this.props.startTask(getGcode4runBoundary(), false)
},
```

New: `runBoundary` reads two values and passes them in.

- `laserFramingPower` from `state.persistentData` via `mapStateToProps`.
- `workSpeed`: derived from `this.props.model.settings.working_parameters.children.work_speed.default_value`. The `model` prop is already mapped in this container. If `model` is `null` (no selected model — the Generate-G-code path already warns on this), fall back to a safe default of `1500` so the call doesn't crash; practically the button would also be no-op in that case.

### UI slider

File: `web/src/containers/laser/ui/Config/WorkingParameters.jsx`.

Add a new `<Row>` directly after the Power row (currently lines 185–198). The new row:

- Reads `laserFramingPower` from `state.persistentData` via an augmented `mapStateToProps`.
- On change, dispatches `persistentDataActions.setLaserFramingPower(value)`.
- Uses the same `ConfigText` / `NumberInput` layout as the Power row, with `min=0`, `max=100`.
- Label: `Framing Power (%)`.
- Tooltip text: `Power used while tracing the boundary. 0 = laser off (dry run).`

The whole `WorkingParameters` panel is only rendered when a laser model is selected (existing guard at line 93). This is fine: Run Boundary also requires at least one model; the slider visibility tracks the relevant workflow.

### Files changed

**Modified:**
- `web/src/reducers/persistentData.js` — add constant, seed, initial state, action.
- `web/src/reducers/laser.js` — parameterise `getGcode4runBoundary`.
- `web/src/containers/laser/ui/Config/Index.jsx` — map new state; pass args to `getGcode4runBoundary`.
- `web/src/containers/laser/ui/Config/WorkingParameters.jsx` — new slider row; import `persistentDataActions`.

**Not changed:** server, gcode translator, CSS, settings JSON, writeAndDraw module, backend tool-path generators.

## Risks and constraints

- **Low-power emission threshold.** Some laser modules don't emit visible light below a certain power. If the user sets Framing Power to 1% and sees nothing, they need to increase. Documented in the tooltip.
- **Marking at the Z height the user set for engraving.** If the user has the head far above focus, low-power framing may not mark. Not worse than current "Run Boundary" expectations.
- **Speed source.** Using the selected model's `work_speed` keeps framing motion consistent with how the job will actually run — this is intentional, since it's the speed the user already tuned for their material. Consequence: framing is slower when the job is slow. Acceptable.
- **Multiple models.** The user might load two models with different `work_speed`s; we use the *currently selected* model's speed. This is the same ambiguity the existing "Run Boundary" has for `power` (there isn't a power today because there isn't framing today) and is not worse than the status quo.

## Testing (manual)

1. Open the laser tab. Load a bitmap; select it. Working Parameters now shows the new Framing Power slider below Power, defaulting to `0`.
2. With Framing Power = 0, click Run Boundary. Verify: head traces corners, laser off (as today).
3. Set Framing Power to 5. Click Run Boundary. Verify: head traces corners, laser visible at low power, four corner moves at the model's work speed, `M5` at the end.
4. Reload the page. Verify: Framing Power slider still shows `5`.
5. Set Framing Power to 0 again. Click Run Boundary. Verify: back to dry run.
6. Generated engraving G-code is unchanged — Run Boundary is a separate command.
