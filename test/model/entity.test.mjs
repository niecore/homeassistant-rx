import * as Entity from "./../../src/model/entity.mjs";

test('isBinarySensor', () => {
    const input = {
        entity_id: "binary_sensor.motionsensor_aqara_12_occupancy"
    }

    expect(Entity.isBinarySensor(input)).toBeTruthy();
});

test('hasDeviceClass', () => {
    const input = {
        new_state: {
            attributes: {
                device_class: "test"
            }
        }

    }
    expect(Entity.hasDeviceClass("test", input)).toBeTruthy();
});

test('hasDeviceClass Falsy', () => {
    const input = {
        new_state: {
            attributes: {
                device_class: "other"
            }
        }

    }
    expect(Entity.hasDeviceClass("test", input)).toBeFalsy();
});