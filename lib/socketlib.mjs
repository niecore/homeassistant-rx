import WebSocket from 'ws';
import ReconnectingWebSocket from 'reconnecting-websocket';
import {curry} from 'ramda';
import {stream} from "kefir";

const options = {
    WebSocket: WebSocket
};

const createSocket = url => new ReconnectingWebSocket(url, [], options);

const send = curry((socket, args) => {
    socket.send(JSON.stringify(args), err => {
        if (err) throw err;
    });
});

const listenTo$ = curry((socket, type) => stream(emitForSocketEvent(socket, type)))

const emitForSocketEvent = curry((socket, type, emitter) => {
    const valueCb = event => emitter.emit(event.data);
    const errorCb = err => emitter.error(err);
    const closeCb = event => {
        emitter.emit(event);
        emitter.end();
    };
    console.log("test")
    switch (type) {
        case 'open':
            socket.addEventListener('open', valueCb);
            break;
        case 'error':
            socket.addEventListener('error', errorCb);
            break;
        case 'close':
            socket.addEventListener('close', closeCb);
            break;
        case 'message':
            socket.addEventListener('message', valueCb);
        default:
            return false;
    }
});

export {
    createSocket,
    listenTo$,
    send,
};