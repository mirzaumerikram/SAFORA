const axios = require('axios');

// Public OSRM demo server by default — override with OSRM_URL for a self-hosted instance.
const OSRM_BASE_URL = process.env.OSRM_URL || 'https://router.project-osrm.org';

/**
 * Returns a road-following polyline [[lng, lat], ...] between two points via OSRM's
 * driving profile. Falls back to a straight 2-point line (the old behaviour) if OSRM
 * is unreachable or errors out, so SafetySentinel monitoring never breaks outright.
 */
async function getRoadRoute(fromCoords, toCoords) {
    const straightLineFallback = [fromCoords, toCoords];
    try {
        const url = `${OSRM_BASE_URL}/route/v1/driving/${fromCoords[0]},${fromCoords[1]};${toCoords[0]},${toCoords[1]}`;
        const { data } = await axios.get(url, {
            params: { overview: 'full', geometries: 'geojson' },
            timeout: 5000,
        });

        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
            return coords;
        }
        console.warn('[Routing] OSRM returned no usable route — falling back to straight line');
        return straightLineFallback;
    } catch (err) {
        console.warn('[Routing] OSRM request failed, falling back to straight line:', err.message);
        return straightLineFallback;
    }
}

module.exports = { getRoadRoute };
