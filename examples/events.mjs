import { haRx } from "./common/connection.mjs"

const statesOfEntity$ = entityId => haRx.events$("state_changed")
    // filter events for the entity
    .filter(ev => ev.entity_id == entityId)
    // only take the new state
    .map(ev => ev.new_state)

const motionDetected$ = statesOfEntity$("binary_sensor.motionsensor_occupancy")
    .filter(state => state.state == "on")

motionDetected$.onValue(_ => console.log("Motion detected!"))