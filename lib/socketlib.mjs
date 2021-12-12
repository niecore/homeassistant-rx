import WebSocket from 'ws';
import {curry} from 'ramda';
import {stream} from "kefir";

const createSocket = url => new WebSocket(url);

const send = curry((socket, args) => {
    socket.send(JSON.stringify(args), err => {
        if (err) throw err;
    });
});

const listenTo$ = curry((socket, type) => stream(emitForSocketEvent(socket, type)))

const emitForSocketEvent = curry((socket, type, emitter) => {
    const valueCb = event => emitter.emit(event);
    const errorCb = err => emitter.error(err);
    const closeCb = event => {
        emitter.emit(event);
        emitter.end();
    };

    switch (type) {
        case 'error':
            socket.on('error', errorCb);
            break;
        case 'close':
            socket.on('close', closeCb);
            break;
        default:
            socket.on(type, valueCb);
    }
});

export {
    createSocket,
    listenTo$,
    send,
};