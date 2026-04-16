export function isNetworkPath(path) {
    if (typeof path !== 'string' || path.length === 0) return false;
    return path.toLowerCase().startsWith('tcp://');
}

export function parseTcpUrl(path) {
    const match = /^tcp:\/\/([^:/]+):(\d+)$/i.exec(path);
    if (!match) {
        throw new Error(`Invalid tcp URL: ${path} (expected tcp://host:port)`);
    }
    return { host: match[1], port: parseInt(match[2], 10) };
}

export function createTransport(path) {
    if (isNetworkPath(path)) {
        const { TcpTransport } = require('./TcpTransport.js');
        return new TcpTransport(path);
    }
    const { SerialTransport } = require('./SerialTransport.js');
    return new SerialTransport(path);
}
