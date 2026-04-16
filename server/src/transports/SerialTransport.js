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
