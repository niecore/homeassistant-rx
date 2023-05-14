import { haRx } from "./common/connection.mjs"

// sunset trigger
export const sunset$ = haRx.trigger$({
    platform: "sun",
    event: "sunset"
})

sunset$.onValue(_ => console.log("Sunset!"))