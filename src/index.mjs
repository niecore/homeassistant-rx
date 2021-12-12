import homeassistantRx from '../lib/homeassistant-rx.mjs';
import movementDetected from './events/movementDetected.mjs'

const haRx = homeassistantRx({
    hostname: "192.168.0.101",
    port: 8123,
    accessToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIzYjE3ZTM3MmNiZjQ0ZjE4YjY4NjAzOTU5ZGM4ZWJkNSIsImlhdCI6MTYzOTIzNDIyOCwiZXhwIjoxOTU0NTk0MjI4fQ.mkVAPURGx9FhE0s3s4K6F_mPZ2W0ij8i8O6gBeJMGxA"
});

async function main() {
    await haRx.connect();

    let areas = await haRx.getAreaRegistry();
    let devices = await haRx.getDeviceRegistry();
    let states = await haRx.getStates();
    let entity = await haRx.getEntityRegistry();
    //console.log(areas);
/*    console.log(JSON.stringify(states));
    console.log(JSON.stringify(entity));
    console.log(JSON.stringify(devices));*/


    const turnLightOn = () => haRx.callService("light", "turn_on", {entity_id: "light.lightbulb_tint_3_light"})
    const lightToggle = () => haRx.callService("light", "toggle", {entity_id: "light.lightbulb_tint_3_light"})
    const lightTurnedOff = haRx.stateTriggers$({entityId: "light.lightbulb_tint_3_light", to: "off"})



    movementDetected(haRx).log()

}

main()