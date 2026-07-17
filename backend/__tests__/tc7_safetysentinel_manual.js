// TC-7 standalone runner (executed via plain `node`, not Jest, because the
// project's installed @turf/turf -> @turf/convex -> concaveman chain ships an
// ESM file that Jest's default transform cannot parse; this is a pre-existing
// tooling gap in the repo, unrelated to SafetySentinel's own logic, and plain
// Node has no trouble loading the same module graph at runtime.)
const assert = require('assert');
const SafetySentinel = require('../utils/SafetySentinel');

async function run() {
    const sentinel = new SafetySentinel({ emit: () => {} });
    const plannedRoute = [[74.3587, 31.5204], [74.3700, 31.5300]]; // Lahore-area line
    sentinel.startMonitoring('ride-tc7', plannedRoute);

    // 1. On-route point -> no alert
    const onRouteAlert = await sentinel.updateLocation('ride-tc7', { lat: 31.5204, lng: 74.3587 });
    assert.strictEqual(onRouteAlert, null, 'expected no alert while on route');
    console.log('[PASS] No alert while driver is on the planned route');

    // 2. Off-route point (~3.6km away, computed by turf inside the class) -> alert fires
    //    immediately on this first reading past the 500m threshold, no grace window.
    const firstDeviationAlert = await sentinel.updateLocation('ride-tc7', { lat: 31.55, lng: 74.40 });
    assert.ok(firstDeviationAlert, 'expected an alert immediately on the first reading past the 500m threshold');
    assert.strictEqual(firstDeviationAlert.type, 'route-deviation');
    assert.ok(firstDeviationAlert.distance > 500, 'distance should exceed the 500m threshold');
    console.log(`[PASS] Alert fired immediately on first off-route reading: distance=${firstDeviationAlert.distance}m`);

    // 3. Still off-route on the next ping -> isDeviated latch prevents a repeat alert
    const stillDeviatedAlert = await sentinel.updateLocation('ride-tc7', { lat: 31.55, lng: 74.40 });
    assert.strictEqual(stillDeviatedAlert, null,
        'expected no repeat alert while still off route — isDeviated should latch until back on route');
    console.log('[PASS] No repeat alert while continuously off route');

    // 4. Back on route resets the deviation latch
    const backOnRoute = await sentinel.updateLocation('ride-tc7', { lat: 31.5204, lng: 74.3587 });
    assert.strictEqual(backOnRoute, null, 'expected no alert once back on the planned route');
    console.log('[PASS] Deviation state resets once the driver returns to the planned route');

    // 5. Deviating again after returning to route fires a fresh alert
    const secondDeviationAlert = await sentinel.updateLocation('ride-tc7', { lat: 31.55, lng: 74.40 });
    assert.ok(secondDeviationAlert, 'expected a fresh alert on deviating again after returning to route');
    console.log('[PASS] Fresh alert fires on a new deviation after returning to route');

    console.log('\nTC-7 RESULT: PASS - deviation detection fires immediately at the documented 500m ' +
        'threshold, with no sustained grace window, matching the current SafetySentinel behaviour.');
}

run().catch((err) => {
    console.error('TC-7 RESULT: FAIL -', err.message);
    process.exit(1);
});
