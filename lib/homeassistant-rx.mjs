import * as R from 'ramda';
import * as socket from "./socketlib.mjs"
import * as Kefir from "kefir"

const isMessageType = R.propEq("type")
const isAuthRequiredMessage = isMessageType("auth_required")
const isEventMessage = isMessageType("event")
const isAuthOkMessage = isMessageType("auth_ok")
const isAuthFailedMessage = isMessageType("auth_invalid")
const eventDataLens = R.lensPath(["event", "data"]);

const homeassistantRx = options => {
    // defaults
    const {protocol = "ws"} = options;
    const {port = 8123} = options;
    const {hostname} = options;
    const {accessToken} = options;

    let rx = {
        subscriptions: {}
    };

    const connect = () => new Promise((resolve, reject) => {

        const resubcribe = () => {
            Object.keys(rx.subscriptions).forEach(key => {
                const command = key
                Object.keys(rx.subscriptions[command]).forEach(data => {
                    sendCommand$(command, JSON.parse(data)).onValue(response => {
                        rx.subscriptions[command][data].id = response.id
                    });
                })
            });
        };

        rx.connected = true;
        rx.haSocket = socket.createSocket(`${protocol}://${hostname}:${port}/api/websocket`);
        rx.haSend = socket.send(rx.haSocket);
        rx.haListen = socket.listenTo$(rx.haSocket);
        rx.out = Kefir.pool()
        rx.out.filter(_ => rx.connected)
            .onValue(rx.haSend);
        
        const onOpen$ = rx.haListen('open');
        const onClose$ = rx.haListen('close');
        const onError$ = rx.haListen('error');
        
        rx.in = rx.haListen('message').map(JSON.parse);

        onOpen$.onValue(ev => {
            rx.connected = true;
            console.info("homeassistant websocket connected")
        });
        onError$.onValue(err => console.warn("homeassistant websocket error: " + err));
        onClose$.onValue( ev => {
            rx.connected = false;
            console.error("homeassistant websocket closed (trying to reconnect)");
        });

        rx.in
            .filter(isAuthRequiredMessage)
            .onValue(() => rx.haSend({type: "auth", access_token: accessToken}));

        rx.in
            .filter(isAuthFailedMessage)
            .onValue((msg) => reject(msg.message));

        rx.in
            .filter(isAuthOkMessage)
            .onValue(_ => resubcribe())
            .onValue((msg) => resolve(msg.ha_version));

        let pingInFlight = false;
        Kefir.interval(10000, true)
            .filter(_ => !pingInFlight)
            .onValue(_ => pingInFlight = true)
            .flatMap(_ => sendCommand$("ping"))
            .onValue(_ => pingInFlight = false)
    });

    let requestId = 42;
    const getRequestId = () => requestId++;

    const sendCommand$ = R.curry((type, args = {}) => {
        const id = getRequestId();
        const response = rx.in
            .filter(R.propEq("id", id))
            .take(1)
            .flatMap(
                response => R.propOr('success', true, response)
                    ? Kefir.constant(response)
                    : Kefir.constantError(response.error)
            );

        rx.out.plug(Kefir.constant(R.mergeLeft({type, id}, args)));

        return response;
    });

    const getResponseId = (command, data) => {
        return rx.subscriptions[command][JSON.stringify(data)].id
    }

    const subscribeAfterCommand = R.curry((command, data) => {
        if(rx.subscriptions[command] == undefined) {
            rx.subscriptions[command] = {}
            if(rx.subscriptions[command][JSON.stringify(data)] == undefined) {
                rx.subscriptions[command][JSON.stringify(data)] = {}
            }
        }

        if(rx.subscriptions[command][JSON.stringify(data)].stream != undefined) {
            return rx.subscriptions[command][JSON.stringify(data)].stream;
        } else {
            const stream = sendCommand$(command, data)
                .flatMap(response => {
                    rx.subscriptions[command][JSON.stringify(data)].id = response.id
                    return rx.in
                        .filter(isEventMessage)
                        .filter(ev => ev.id == getResponseId(command, data))
                })
            rx.subscriptions[command][JSON.stringify(data)].stream = stream;
            return stream;
        }
    });

    const getResultFromCommand = (command, eventData = {}, result_id="result") => sendCommand$(command, eventData)
        .map(R.prop(result_id))
        .take(1)
        .toPromise();

    const events$ = (eventType) => subscribeAfterCommand("subscribe_events", {event_type: eventType})
        .map(R.view(eventDataLens));

    const trigger$ = trigger => subscribeAfterCommand("subscribe_trigger", {trigger})

    const fireEvent = R.curry((eventType, eventData = {}) => getResultFromCommand("fire_event", {
        event_type: eventType,
        event_data: eventData
    }));

    const callService = R.curry((domain, service, target = {}, serviceData = {},) => getResultFromCommand("call_service", {
        domain,
        service,
        service_data: serviceData,
        target
    }));

    const getStates = () => getResultFromCommand("get_states");
    const getConfig = () => getResultFromCommand("get_config");
    const getServices = () => getResultFromCommand("get_services");
    const getAreaRegistry = () => getResultFromCommand("config/area_registry/list");
    const getDeviceRegistry = () => getResultFromCommand("config/device_registry/list");
    const getEntityRegistry = () => getResultFromCommand("config/entity_registry/list");

    return {
        connect,
        events$,
        trigger$,
        fireEvent,
        callService,
        getStates,
        getConfig,
        getServices,
        getAreaRegistry,
        getDeviceRegistry,
        getEntityRegistry
    }
}

export {homeassistantRx as default};
