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
