import homeassistantRx from "homeassistant-rx";

export const haRx = homeassistantRx({
    hostname: process.env.HOMEASSISTANT_RX_HOSTNAME,
    accessToken: process.env.HOMEASSISTANT_RX_TOKEN
});

await haRx.connect();
