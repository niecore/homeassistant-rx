import * as R from 'ramda';
import * as socket from "./socketlib.mjs"
import * as Kefir from "kefir"

const isMessageType = R.propEq("type")
const isEventType = R.propEq("event_type")
const isAuthRequiredMessage = isMessageType("auth_required")
const isEventMessage = isMessageType("event")
const isAuthOkMessage = isMessageType("auth_ok")
const isAuthFailedMessage = isMessageType("auth_invalid")
const eventDataLens = R.lensPath(["event", "data"]);

// todo
// - remove option object of call service

const homeassistantRx = options => {
    // defaults
    const {protocol = "ws"} = options;
    const {port = 8123} = options;
    const {hostname} = options;
    const {accessToken} = options;

    let rx = {};

    const connect = () => new Promise((resolve, reject) => {
        rx.connected = true;
        rx.haSocket = socket.createSocket(`${protocol}://${hostname}:${port}/api/websocket`);
        rx.haSend = socket.send(rx.haSocket);
        rx.haListen = socket.listenTo$(rx.haSocket);

        rx.out = Kefir.pool();
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
            setTimeout(() => connect(), 5000);
            console.error("homeassistant websocket closed (trying to reconnect");
        });

        rx.in
            .filter(isAuthRequiredMessage)
            .take(1)
            .onValue(() => rx.haSend({type: "auth", access_token: accessToken}));

        rx.in
            .filter(isAuthFailedMessage)
            .onValue((msg) => reject(msg.message));

        rx.in
            .filter(isAuthOkMessage)
            .onValue((msg) => resolve(msg.ha_version));

        let pingInFlight = false;
        Kefir.interval(200, true)
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

    const subscribeAfterCommand = R.curry((command, data) => sendCommand$(command, data)
        .flatMap(response => {
            return rx.in
                .filter(isEventMessage)
                .filter(R.propEq("id", response.id))
        }));

    const getResultFromCommand = (command, eventData = {}, result_id="result") => sendCommand$(command, eventData)
        .map(R.prop(result_id))
        .take(1)
        .toPromise();

    const events$ = (eventType) => subscribeAfterCommand("subscribe_events", {event_type: eventType})
        .map(R.view(eventDataLens));

    const stateTriggers$ = options => {
        const {entityId} = options;
        const {from = null} = options;
        const {to = null} = options;
        const {duration = null} = options;

        return subscribeAfterCommand("subscribe_trigger",
            {
                trigger: {
                    platform: "state",
                    entity_id: entityId,
                    from: from,
                    to: to,
                    for: duration
                }
            })
    };

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
        stateTriggers$,
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
