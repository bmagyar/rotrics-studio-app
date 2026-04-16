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

    _openNew(path) {
        let transport;
        try {
            transport = createTransport(path);
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
