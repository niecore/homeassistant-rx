import * as R from 'ramda';

const isEntityType = R.curry((entityTye, data) => R.pipe(
    R.propOr("", "entity_id"),
    R.startsWith(entityTye + ".")
)(data))

const isBinarySensor = isEntityType("binary_sensor")

const hasDeviceClass =  R.curry((deviceClass, data) => R.pipe(
    R.pathOr("", ["new_state", "attributes", "device_class"]),
    R.equals(deviceClass)
)(data))

export {isBinarySensor, hasDeviceClass};