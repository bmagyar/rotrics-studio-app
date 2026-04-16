import assert from 'assert';
import { isNetworkPath, parseTcpUrl } from '../src/transports/index.js';

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

let _failed = 0;
let _chain = Promise.resolve();
for (const _t of _tests) {
    ((t) => {
        _chain = _chain.then(() => Promise.resolve().then(t.fn).then(
            () => console.log(`ok - ${t.name}`),
            (err) => {
                _failed++;
                console.error(`FAIL - ${t.name}`);
                console.error(err && err.stack ? err.stack : err);
            }
        ));
    })(_t);
}
_chain.then(() => {
    if (_failed > 0) {
        console.error(`${_failed}/${_tests.length} test(s) failed`);
        process.exit(1);
    } else {
        console.log(`all ${_tests.length} tests passed`);
    }
});
