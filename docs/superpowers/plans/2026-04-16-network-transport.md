# Network Transport for Serial Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Rotrics Studio connect to a DexArm over the network by accepting a `tcp://host:port` URL in the same place it currently accepts a local serial device path. Targets `ser2net` running on a Raspberry Pi whose USB port is physically connected to the arm.

**Architecture:** Introduce a small transport abstraction in `server/src/transports/`. A factory returns either a `SerialTransport` (wraps `serialport@9`) or a `TcpTransport` (wraps `net.Socket`) based on whether the caller-supplied path starts with `tcp://`. Both transports expose the same event/method surface (`open`, `close`, `write`, events: `open`, `close`, `error`, `data`) and both attach a `@serialport/parser-readline` to their readable stream so downstream consumers (`gcodeSender.js`) keep using `serialPortManager.readLineParser` unchanged. The web UI gains a text input in the existing "Connect DexArm" modal for entering a URL alongside the auto-discovered local paths.

**Tech Stack:** Node.js 14 (ESM via babel-register, the version pinned by `Dockerfile.server`), `serialport@9`, `@serialport/parser-readline`, `net` (built-in). Web: React 16 + Redux + antd 4, built by `Dockerfile.web`.

**Build/test via Docker only.** This repo has no supported native development setup — `docker compose` is the contract. All build, smoke, and test commands below are written as Docker invocations. Docker Compose services: `server` (`Dockerfile.server`) and `web` (`Dockerfile.web`).

**Test runner:** a tiny homegrown runner using `node:assert` (not `node:test`, which is not available in Node 14). The runner lives inside the test file — no new package dependency, no `package.json` script needed. Tests are invoked with:

```bash
docker compose run --rm --entrypoint node server test/transports.test.js
```

**Out of scope for v1 (explicitly):**
- **Firmware upgrade over TCP.** User confirmed they will never flash firmware over ethernet; physical USB is the only supported upgrade path. `firmwareUpgradeManager.js` is left untouched — if someone does try a firmware upgrade while connected via `tcp://`, the underlying `new SerialPort('tcp://...', ...)` call will throw and the existing error path will surface the failure. Not pretty, but acceptable per user.
- Reconnect / retry on socket drop. V1 emits `SERIAL_PORT_CLOSE` on socket errors and relies on the user to re-connect.
- Persisting entered URLs across app restarts.
- Auto-discovering `ser2net` hosts via mDNS.

---

## File Structure

### New files
- `server/src/transports/SerialTransport.js` — wraps node-serialport behind the shared interface.
- `server/src/transports/TcpTransport.js` — wraps `net.Socket` behind the shared interface.
- `server/src/transports/index.js` — exports `createTransport(path)` factory + `isNetworkPath(path)` helper.
- `server/test/transports.test.js` — unit tests using a tiny inline runner built on `assert` (Node 14 compatible, no new deps).

### Modified files
- `server/src/serialPortManager.js` — delegate to `createTransport`; keep `readLineParser` as a pass-through to the transport's parser so callers don't change.
- `web/src/containers/header/Index.jsx` — add a URL text input to the connect modal; submit calls the existing `openSerialPort(path)` with either the dropdown value or the URL.

### No new dependencies
Nothing is added to `server/package.json` or `web/package.json`. The plan reuses only:
- `serialport` and its already-resolved peer `@serialport/parser-readline` (via the existing `serialport@9` install)
- Node built-ins: `events`, `net`, `assert`

### Unchanged but worth knowing
- `server/src/gcode/gcodeSender.js`, `deviceStateMonitor.js`, `frontEndPositionMonitor.js` — they access `serialPortManager.readLineParser` and `serialPortManager.write()`. The refactor preserves both, so no change is needed.
- `server/src/start-server.js` — the `SERIAL_PORT_OPEN` socket event already passes `path` straight through to `serialPortManager.open(path)`. `path` being a URL just falls out.

---

## Task 1: Transport factory and path detection

**Files:**
- Create: `server/src/transports/index.js`
- Create: `server/test/transports.test.js`

- [ ] **Step 1: Write the failing test**

```js
// server/test/transports.test.js
import assert from 'assert';
import { isNetworkPath } from '../src/transports/index.js';

const _tests = [];
export function test(name, fn) { _tests.push({ name, fn }); }

test('isNetworkPath: tcp URL', () => {
    assert.strictEqual(isNetworkPath('tcp://192.168.1.50:2000'), true);
});

test('isNetworkPath: tcp URL with hostname', () => {
    assert.strictEqual(isNetworkPath('tcp://pi.local:2000'), true);
});

test('isNetworkPath: local linux path', () => {
    assert.strictEqual(isNetworkPath('/dev/ttyUSB0'), false);
});

test('isNetworkPath: local windows path', () => {
    assert.strictEqual(isNetworkPath('COM3'), false);
});

test('isNetworkPath: null/undefined/empty', () => {
    assert.strictEqual(isNetworkPath(null), false);
    assert.strictEqual(isNetworkPath(undefined), false);
    assert.strictEqual(isNetworkPath(''), false);
});

test('isNetworkPath: case-insensitive scheme', () => {
    assert.strictEqual(isNetworkPath('TCP://pi:2000'), true);
});

// Runner — executes when this file is the entry point.
(async () => {
    let failed = 0;
    for (const t of _tests) {
        try {
            await t.fn();
            console.log(`ok - ${t.name}`);
        } catch (err) {
            failed++;
            console.error(`FAIL - ${t.name}`);
            console.error(err && err.stack ? err.stack : err);
        }
    }
    if (failed > 0) {
        console.error(`${failed}/${_tests.length} test(s) failed`);
        process.exit(1);
    } else {
        console.log(`all ${_tests.length} tests passed`);
    }
})();
```

Note: the runner IIFE at the bottom runs on import. Subsequent tasks that *append* tests to this file must add them **above** the runner block. The executor should literally insert new `test(...)` calls before the `// Runner — …` comment.

- [ ] **Step 2: Run the test and watch it fail**

```bash
docker compose build server
docker compose run --rm --entrypoint node server test/transports.test.js
```

Expected: FAIL with `Cannot find module '../src/transports/index.js'` (or similar module-resolution error). Exit code non-zero.

- [ ] **Step 3: Implement `isNetworkPath` and the factory skeleton**

```js
// server/src/transports/index.js
export function isNetworkPath(path) {
    if (typeof path !== 'string' || path.length === 0) return false;
    return path.toLowerCase().startsWith('tcp://');
}

export function parseTcpUrl(path) {
    // Returns { host, port } or throws on malformed input.
    const match = /^tcp:\/\/([^:/]+):(\d+)$/i.exec(path);
    if (!match) {
        throw new Error(`Invalid tcp URL: ${path} (expected tcp://host:port)`);
    }
    return { host: match[1], port: parseInt(match[2], 10) };
}

export async function createTransport(path) {
    if (isNetworkPath(path)) {
        const { TcpTransport } = await import('./TcpTransport.js');
        return new TcpTransport(path);
    }
    const { SerialTransport } = await import('./SerialTransport.js');
    return new SerialTransport(path);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
docker compose build server
docker compose run --rm --entrypoint node server test/transports.test.js
```

Expected: `all 6 tests passed`, exit 0.

- [ ] **Step 5: Add a `parseTcpUrl` test**

Edit `server/test/transports.test.js`. Add this import near the top (next to the existing `isNetworkPath` import):

```js
import { parseTcpUrl } from '../src/transports/index.js';
```

And insert these three test blocks **above** the runner IIFE (the `// Runner — …` block):

```js
test('parseTcpUrl: valid URL', () => {
    assert.deepStrictEqual(parseTcpUrl('tcp://192.168.1.50:2000'), { host: '192.168.1.50', port: 2000 });
});

test('parseTcpUrl: hostname', () => {
    assert.deepStrictEqual(parseTcpUrl('tcp://pi.local:2000'), { host: 'pi.local', port: 2000 });
});

test('parseTcpUrl: malformed throws', () => {
    assert.throws(() => parseTcpUrl('tcp://no-port'), /Invalid tcp URL/);
    assert.throws(() => parseTcpUrl('not a url'), /Invalid tcp URL/);
});
```

- [ ] **Step 6: Run the tests to verify all pass**

```bash
docker compose run --rm --entrypoint node server test/transports.test.js
```

Expected: `all 9 tests passed`, exit 0.

- [ ] **Step 7: Commit**

```bash
git add server/src/transports/index.js server/test/transports.test.js
git commit -m "add transport factory with tcp:// path detection"
```

---

## Task 2: SerialTransport wrapper

**Files:**
- Create: `server/src/transports/SerialTransport.js`

This wraps the existing `serialport` usage with the same shape as the future `TcpTransport`. The interface is:

- Methods: `open(cb)`, `close(cb)`, `write(data, cb)`, `isOpen()` (getter), `getPath()` (getter).
- Events: `open`, `close`, `error`, `data` (raw buffer).
- Property: `readLineParser` — a `ReadLineParser` attached to the readable stream, so `serialPortManager` can expose it unchanged.

- [ ] **Step 1: Write the implementation**

```js
// server/src/transports/SerialTransport.js
import EventEmitter from 'events';
import SerialPort from 'serialport';
import ReadLineParser from '@serialport/parser-readline';

const BAUD_RATE = 115200;

export class SerialTransport extends EventEmitter {
    constructor(path) {
        super();
        this._path = path;
        this._port = new SerialPort(path, { baudRate: BAUD_RATE, autoOpen: false });
        this.readLineParser = this._port.pipe(new ReadLineParser({ delimiter: '\n' }));

        this._port.on('open', () => this.emit('open', this._path));
        this._port.on('close', () => this.emit('close', this._path));
        this._port.on('error', (err) => this.emit('error', err));
        this._port.on('data', (buf) => this.emit('data', buf));
    }

    get isOpen() {
        return this._port.isOpen;
    }

    getPath() {
        return this._path;
    }

    open(cb) {
        this._port.open((err) => {
            if (cb) cb(err);
        });
    }

    close(cb) {
        if (!this._port.isOpen) {
            if (cb) cb(null);
            return;
        }
        this._port.close((err) => {
            if (cb) cb(err);
        });
    }

    write(data, cb) {
        this._port.write(data, (err) => {
            if (cb) cb(err);
        });
    }
}
```

- [ ] **Step 2: Rebuild and verify the module imports cleanly**

```bash
docker compose build server
docker compose run --rm --entrypoint node server -e "require('./src/transports/SerialTransport.js')"
```

Expected: exit 0, no output. Any syntax error or missing module will surface here.

(The server app itself uses `babel-register` via `index.js` — if bare `node` can't parse the ESM `import`, switch the command to `docker compose run --rm --entrypoint sh server -c "node -r babel-register -e \"require('./src/transports/SerialTransport.js')\""` — verify before proceeding.)

- [ ] **Step 3: Commit**

```bash
git add server/src/transports/SerialTransport.js
git commit -m "add serial transport wrapper"
```

---

## Task 3: TcpTransport

**Files:**
- Create: `server/src/transports/TcpTransport.js`
- Modify: `server/test/transports.test.js` (append loopback test)

- [ ] **Step 1: Write the failing loopback test**

Edit `server/test/transports.test.js`. Add these imports near the top:

```js
import net from 'net';
import { TcpTransport } from '../src/transports/TcpTransport.js';
```

Insert these two test blocks **above** the runner IIFE:

```js
test('TcpTransport: connects, writes, receives line', async () => {
    const received = [];
    const server = net.createServer((sock) => {
        sock.on('data', (buf) => {
            received.push(buf.toString());
            // Echo a line back so we can test the line parser.
            sock.write('ok\n');
        });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const t = new TcpTransport(`tcp://127.0.0.1:${port}`);
    const opened = new Promise((resolve) => t.once('open', resolve));
    t.open(() => {});
    await opened;

    const line = new Promise((resolve) => t.readLineParser.once('data', resolve));
    t.write('G28\n');
    const lineReceived = await line;
    assert.equal(lineReceived, 'ok');
    assert.deepEqual(received, ['G28\n']);

    await new Promise((resolve) => t.close(resolve));
    await new Promise((resolve) => server.close(resolve));
});

test('TcpTransport: emits close on server disconnect', async () => {
    const server = net.createServer((sock) => {
        setImmediate(() => sock.end());
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const t = new TcpTransport(`tcp://127.0.0.1:${port}`);
    const opened = new Promise((resolve) => t.once('open', resolve));
    const closed = new Promise((resolve) => t.once('close', resolve));
    t.open(() => {});
    await opened;
    await closed;

    await new Promise((resolve) => server.close(resolve));
});
```

- [ ] **Step 2: Run the tests and watch them fail**

```bash
docker compose run --rm --entrypoint node server test/transports.test.js
```

Expected: FAIL with `Cannot find module '../src/transports/TcpTransport.js'`.

- [ ] **Step 3: Implement `TcpTransport`**

```js
// server/src/transports/TcpTransport.js
import EventEmitter from 'events';
import net from 'net';
import ReadLineParser from '@serialport/parser-readline';
import { parseTcpUrl } from './index.js';

export class TcpTransport extends EventEmitter {
    constructor(path) {
        super();
        this._path = path;
        const { host, port } = parseTcpUrl(path);
        this._host = host;
        this._port = port;
        this._socket = new net.Socket();
        this._isOpen = false;
        this.readLineParser = this._socket.pipe(new ReadLineParser({ delimiter: '\n' }));

        this._socket.on('connect', () => {
            this._isOpen = true;
            this.emit('open', this._path);
        });
        this._socket.on('close', () => {
            const wasOpen = this._isOpen;
            this._isOpen = false;
            if (wasOpen) this.emit('close', this._path);
        });
        this._socket.on('error', (err) => this.emit('error', err));
        this._socket.on('data', (buf) => this.emit('data', buf));
    }

    get isOpen() {
        return this._isOpen;
    }

    getPath() {
        return this._path;
    }

    open(cb) {
        const onError = (err) => {
            this._socket.removeListener('connect', onConnect);
            if (cb) cb(err);
        };
        const onConnect = () => {
            this._socket.removeListener('error', onError);
            if (cb) cb(null);
        };
        this._socket.once('error', onError);
        this._socket.once('connect', onConnect);
        this._socket.connect({ host: this._host, port: this._port });
    }

    close(cb) {
        if (!this._isOpen) {
            if (cb) cb(null);
            return;
        }
        this._socket.once('close', () => {
            if (cb) cb(null);
        });
        this._socket.end();
    }

    write(data, cb) {
        if (!this._isOpen) {
            if (cb) cb(new Error('TcpTransport not open'));
            return;
        }
        this._socket.write(data, (err) => {
            if (cb) cb(err || null);
        });
    }
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
docker compose build server
docker compose run --rm --entrypoint node server test/transports.test.js
```

Expected: `all 11 tests passed`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add server/src/transports/TcpTransport.js server/test/transports.test.js
git commit -m "add tcp transport with loopback tests"
```

---

## Task 4: Refactor SerialPortManager to use the transport factory

**Files:**
- Modify: `server/src/serialPortManager.js`

The goals: (1) `open(path)` accepts both `/dev/ttyUSB0`-style paths and `tcp://host:port` URLs, (2) `readLineParser` and `write()` keep behaving exactly as before for downstream callers, (3) `SerialPort.list()` polling still emits local device paths for the UI dropdown.

- [ ] **Step 1: Replace the contents of `serialPortManager.js`**

```js
// server/src/serialPortManager.js
import EventEmitter from 'events';
import SerialPort from 'serialport';
import {
    SERIAL_PORT_PATH_UPDATE,
    SERIAL_PORT_GET_OPENED,
    SERIAL_PORT_OPEN,
    SERIAL_PORT_CLOSE,
    SERIAL_PORT_ERROR,
    SERIAL_PORT_WRITE_ERROR,
    SERIAL_PORT_WRITE_OK,
    SERIAL_PORT_DATA,
} from "./constants.js";
import { utf8bytes2string } from './utils/index.js';
import { createTransport, isNetworkPath } from './transports/index.js';

class SerialPortManager extends EventEmitter {
    constructor() {
        super();
        this.transport = null;
        this.readLineParser = null;

        setInterval(() => {
            SerialPort.list().then(
                (ports) => {
                    const paths = ports.map((item) => item.path);
                    this.emit(SERIAL_PORT_PATH_UPDATE, paths);

                    // A local transport whose device disappeared counts as "pulled out".
                    const current = this.transport && this.transport.getPath();
                    if (
                        current &&
                        !isNetworkPath(current) &&
                        this.transport.isOpen &&
                        !paths.includes(current)
                    ) {
                        console.log('serial port -> close: opened port is pulled out: ' + current);
                        this.emit(SERIAL_PORT_CLOSE, current);
                        this.transport = null;
                        this.readLineParser = null;
                    }
                },
                (error) => {
                    this.emit(SERIAL_PORT_ERROR, error);
                }
            );
        }, 500);
    }

    getOpened() {
        if (this.transport && this.transport.isOpen) {
            return this.transport.getPath();
        }
        return null;
    }

    async _openNew(path) {
        let transport;
        try {
            transport = await createTransport(path);
        } catch (err) {
            this.emit(SERIAL_PORT_ERROR, err);
            return;
        }
        this.transport = transport;
        this.readLineParser = transport.readLineParser;

        transport.on('data', (buffer) => {
            if (Buffer.isBuffer(buffer)) {
                const arr = [];
                for (let i = 0; i < buffer.length; i++) arr.push(buffer[i]);
                // Keeping the utf8 decode call for parity with the original; its only
                // effect was a commented-out console.log, but removing it would silently
                // drop the side of the `data` event that ran it.
                utf8bytes2string(arr);
            }
        });

        transport.readLineParser.on('data', (line) => {
            this.emit(SERIAL_PORT_DATA, { received: String(line).trim() });
        });

        transport.on('open', (p) => {
            console.log('serial port -> open: ' + p);
            this.emit(SERIAL_PORT_OPEN, p);
        });

        transport.on('close', (p) => {
            console.log('serial port -> close: ' + p);
            this.emit(SERIAL_PORT_CLOSE, p);
            this.transport = null;
            this.readLineParser = null;
        });

        transport.on('error', (err) => {
            console.log('serial port -> error: ' + (transport.getPath() || ''));
            this.emit(SERIAL_PORT_ERROR, err);
            this.transport = null;
            this.readLineParser = null;
        });

        transport.open((error) => {
            if (error) {
                this.transport = null;
                this.readLineParser = null;
                this.emit(SERIAL_PORT_ERROR, error);
            }
        });
    }

    open(path) {
        if (!this.transport) {
            this._openNew(path);
            return;
        }
        const current = this.transport.getPath();
        if (this.transport.isOpen && current === path) {
            console.log('The port ' + path + ' has been opened');
            this.emit(SERIAL_PORT_OPEN, current);
            return;
        }
        if (this.transport.isOpen && current !== path) {
            this.close();
            this._openNew(path);
            return;
        }
        // transport exists but is closed: replace unconditionally
        this._openNew(path);
    }

    close() {
        if (this.transport && this.transport.isOpen) {
            this.transport.close((error) => {
                if (error) this.emit(SERIAL_PORT_ERROR, error);
            });
        }
    }

    write(data) {
        if (this.transport && this.transport.isOpen) {
            this.transport.write(data, (error) => {
                if (error) {
                    console.error('write error: ' + data);
                    this.emit(SERIAL_PORT_ERROR, error);
                } else {
                    this.emit(SERIAL_PORT_WRITE_OK, data);
                }
            });
        } else {
            console.warn('Port is closed');
        }
    }
}

const serialPortManager = new SerialPortManager();
export default serialPortManager;
```

- [ ] **Step 2: Rebuild and syntax-check inside the container**

```bash
docker compose build server
docker compose run --rm --entrypoint node server --check src/serialPortManager.js
```

Expected: exit 0, no output.

- [ ] **Step 3: Run the transport tests — they should still pass**

```bash
docker compose run --rm --entrypoint node server test/transports.test.js
```

Expected: `all 11 tests passed`, exit 0.

- [ ] **Step 4: Smoke-test the server starts**

```bash
docker compose up -d server
sleep 3
docker compose logs server | tail -30
docker compose down
```

Expected: logs show the server booting (`koa` / `socket.io` banners, the 500 ms `SerialPort.list()` loop ticking without throwing). No uncaught exceptions, no `MODULE_NOT_FOUND`.

- [ ] **Step 5: Commit**

```bash
git add server/src/serialPortManager.js
git commit -m "route serialPortManager through transport factory"
```

---

## Task 5: Web UI — add URL input to the connect modal

**Files:**
- Modify: `web/src/containers/header/Index.jsx`

The modal currently has a single antd `<Select>` populated from `paths`. We'll add an `<Input>` next to it for a URL. Connecting prefers the URL field if non-empty, otherwise falls back to the dropdown.

- [ ] **Step 1: Add Input import and URL state**

At the top of `web/src/containers/header/Index.jsx`, change:

```js
import {Button, Modal, Select, Space, Switch} from 'antd';
```

to:

```js
import {Button, Modal, Select, Space, Switch, Input} from 'antd';
```

In the `state = { ... }` block (around line 21-24), add `networkUrl`:

```js
state = {
    serialPortModalVisible: false,
    selectedPath: undefined,
    networkUrl: '',
};
```

- [ ] **Step 2: Update the connect handler to prefer the URL**

Replace the existing `openSerialPort` action in the `actions = { ... }` block with:

```js
openSerialPort: () => {
    const url = (this.state.networkUrl || '').trim();
    if (url) {
        if (!/^tcp:\/\/[^:/]+:\d+$/i.test(url)) {
            notificationI18n.error({
                message: 'Invalid URL',
                description: 'Use tcp://host:port — e.g. tcp://pi.local:2000',
            });
            return;
        }
        this.props.openSerialPort(url);
    } else {
        this.props.openSerialPort(this.state.selectedPath);
    }
},
```

And add a setter alongside the other handlers:

```js
setNetworkUrl: (e) => {
    this.setState({ networkUrl: e.target.value });
},
```

- [ ] **Step 3: Update `connectDisabled` logic to consider the URL field**

Replace the `connectDisabled` / `disconnectDisabled` block (around lines 115-128) with:

```js
const urlTrim = (state.networkUrl || '').trim();
const urlSelected = urlTrim.length > 0;
const effectivePath = urlSelected ? urlTrim : selectedPath;

let connectDisabled = false;
let disconnectDisabled = false;
if (!effectivePath) {
    connectDisabled = true;
    disconnectDisabled = true;
} else if (effectivePath === path) {
    connectDisabled = true;
    disconnectDisabled = false;
} else {
    connectDisabled = false;
    disconnectDisabled = true;
}
```

And update the `statusDes` block just above it so it reflects the effective path:

```js
let statusDes = '';
const effective = urlTrim.length > 0 ? urlTrim : selectedPath;
if (effective) {
    statusDes = effective === path ? 'Connected' : 'Disconnected';
}
```

(Remove the old `if (selectedPath) { ... }` block that sets `statusDes`.)

- [ ] **Step 4: Add the Input to the modal body**

In the `<Modal>` body, replace the existing `<Space direction="vertical">...<Select/></Space>` with:

```jsx
<Space direction={"vertical"} style={{width: '100%'}}>
    <h4>{`${t('Status')}: ${t(statusDes)}`}</h4>
    <Select
        style={{width: 300}}
        value={selectedPath}
        onChange={actions.selectPath}
        placeholder={t("Choose a port")}
        disabled={urlSelected}
        options={options}/>
    <div style={{paddingTop: 8}}>
        <span>{t('or network URL')}: </span>
        <Input
            style={{width: 300}}
            value={state.networkUrl}
            onChange={actions.setNetworkUrl}
            placeholder="tcp://pi.local:2000"
            allowClear/>
    </div>
</Space>
```

- [ ] **Step 5: Build the web image to catch syntax errors**

```bash
docker compose build web 2>&1 | tail -60
```

Expected: `webpack --mode=production` finishes cleanly and `docker compose build` exits 0. Any JSX/syntax issue in the modified file surfaces here.

- [ ] **Step 6: Commit**

```bash
git add web/src/containers/header/Index.jsx
git commit -m "add network url input to connect modal"
```

---

## Task 6: End-to-end manual test

This task has no code. It's a checklist to run after tasks 1-5 are committed. Record the outcome of each step.

- [ ] **Step 1: Rebuild and start the app**

```bash
docker compose build
docker compose up
```

Expected: web served at `http://localhost:8080`, server socket.io on `http://localhost:9000`.

- [ ] **Step 2: Baseline — connect via USB still works**

Plug the arm in, open the Connect DexArm modal, select `/dev/ttyACM0` (or equivalent), click Connect. Verify:
- Status shows "Connected"
- The terminal tab echoes the arm's startup banner
- Sending `M114` returns a coordinate line (`X:... Y:... Z:...`)

- [ ] **Step 3: Set up ser2net on the Pi**

On the Raspberry Pi:

```bash
sudo apt install ser2net
sudo tee /etc/ser2net.yaml <<'EOF'
connection: &rotrics
    accepter: tcp,2000
    connector: serialdev,/dev/ttyACM0,115200n81,local
    options:
        max-connections: 1
EOF
sudo systemctl restart ser2net
```

Verify from the desktop:

```bash
nc <pi-ip> 2000
# type: M114
# expect a coordinate line back
# Ctrl-C to quit
```

- [ ] **Step 4: Connect via network from the app**

In the Connect DexArm modal, leave the dropdown untouched. Enter `tcp://<pi-ip>:2000` in the URL field. Click Connect. Verify:
- Status shows "Connected"
- Terminal shows arm output
- Jog buttons move the arm
- A small job (a dozen lines of G-code) runs to completion without stalls

- [ ] **Step 5: Disconnect and reconnect**

Click Disconnect. Verify the modal flips to Disconnected. Click Connect again. Verify the arm reconnects.

- [ ] **Step 6: Error cases**

- Enter `tcp://no-such-host:2000` → expect a connection error surfaced in the UI (no crash).
- Enter `tcp://pi:99999` → expect a validation error from the client-side regex, no socket attempt.
- Kill `ser2net` on the Pi while the app is connected → expect `SERIAL_PORT_CLOSE` to fire and the UI to flip to Disconnected.

- [ ] **Step 7: Commit nothing, but note the outcome**

Either:
- All green: proceed to merge.
- Anything red: open a followup task and iterate before merging.

---

## Self-review checklist (completed by plan author)

- [x] **Spec coverage:** every concern raised in the brainstorming conversation — TCP transport, UI input, manual E2E — has a task. Firmware-upgrade-over-ethernet explicitly ruled out by user.
- [x] **Placeholder scan:** no TBDs or "handle errors appropriately" in code steps; each code block is complete and runnable.
- [x] **Type consistency:** interface on both transports (`open/close/write/isOpen/getPath`, events `open/close/error/data`, property `readLineParser`) matches between `SerialTransport.js`, `TcpTransport.js`, and consumer in `serialPortManager.js`.
- [x] **No dependency changes:** no modifications to `server/package.json` or `web/package.json`. Only existing deps + Node built-ins.
- [x] **Build & test via Docker only:** every command in the plan is a `docker compose` invocation — no assumption of a native Node/npm toolchain on the host.
