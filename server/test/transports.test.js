import assert from 'assert';
import net from 'net';
import { isNetworkPath, parseTcpUrl } from '../src/transports/index.js';
import { TcpTransport } from '../src/transports/TcpTransport.js';

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

test('TcpTransport: connects, writes, receives line', () => {
    return new Promise((resolve, reject) => {
        const received = [];
        const server = net.createServer((sock) => {
            sock.on('data', (buf) => {
                received.push(buf.toString());
                sock.write('ok\n');
            });
        });
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            const t = new TcpTransport(`tcp://127.0.0.1:${port}`);
            t.once('open', () => {
                t.readLineParser.once('data', (line) => {
                    try {
                        assert.strictEqual(line, 'ok');
                        assert.deepStrictEqual(received, ['G28\n']);
                    } catch (err) {
                        server.close();
                        reject(err);
                        return;
                    }
                    t.close(() => server.close(() => resolve()));
                });
                t.write('G28\n');
            });
            t.open((err) => {
                if (err) {
                    server.close();
                    reject(err);
                }
            });
        });
    });
});

test('TcpTransport: emits close on server disconnect', () => {
    return new Promise((resolve, reject) => {
        const server = net.createServer((sock) => {
            setImmediate(() => sock.end());
        });
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            const t = new TcpTransport(`tcp://127.0.0.1:${port}`);
            let opened = false;
            t.once('open', () => { opened = true; });
            t.once('close', () => {
                try {
                    assert.strictEqual(opened, true);
                } catch (err) {
                    server.close();
                    reject(err);
                    return;
                }
                server.close(() => resolve());
            });
            t.open(() => {});
        });
    });
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
