import { haRx } from "./common/connection.mjs"

const turnLightsOn = entityId => haRx.callService("light", "turn_on", { entity_id: entityId })
const turnLightsOff = entityId => haRx.callService("light", "turn_off", { entity_id: entityId })

turnLightsOn("light.shellydimmer_f3ab9c")
    .then(_ => console.log("Lights on!"))
    // wait 5 seconds
    .then(_ => new Promise(resolve => setTimeout(resolve, 5000)))
    // turn lights off again
    .then(_ => turnLightsOff("light.shellydimmer_f3ab9c"))
    .then(_ => console.log("Lights off!"))