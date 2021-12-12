import * as R from 'ramda';
import {isBinarySensor, hasDeviceClass} from "../model/entity.mjs";

const movementDetected$ = haRx => {
    const isOccupancySensor = R.allPass([isBinarySensor,hasDeviceClass("occupancy")])
    const isMovementDetected = R.pathEq(["new_state", "state"], "on")
    const createMovementDetectedEvent = room => haRx.fireEvent("movement_detected", {room});

    return haRx
        .events$("state_changed")
        .filter(isOccupancySensor)
        .filter(isMovementDetected)
        .onValue(_ => createMovementDetectedEvent("test"))
}

export {movementDetected$ as default};