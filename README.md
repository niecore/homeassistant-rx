# homeassistant-rx

reactive extension for homeassistant based on kefir-js.

## usage

Install:

    npm i --save homeassistant-rx

Example:

    import homeassistantRx from 'homeassistant-rx.mjs';

    const haRx = homeassistantRx({
        hostname: "192.168.0.101",
        accessToken: "your_token"
    });

    await haRx.connect()

    const motionDetected = haRx.stateTriggers$({entityId: "binary_sensor.motion_entity_1", to: "on"})
    const turnLighsOn = haRx.callService("light", "turn_on", {entity_id: light.light_entity_1})

    motionDetected.onValue(turnLighsOn)