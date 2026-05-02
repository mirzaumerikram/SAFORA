/**
 * Redis client — graceful fallback when REDIS_URL is not set.
 * On Railway: add REDIS_URL as an environment variable from a Redis addon.
 * Locally: set REDIS_URL=redis://localhost:6379 or leave unset to use in-memory fallback.
 */
const Redis = require('ioredis');

let redisClient = null;

// ── In-memory fallback (used when Redis is unavailable) ──────────────────────
// Matches the same API surface so callers don't need to change.
const memStore = new Map();

const fallback = {
    get:    async (k)    => memStore.get(k) ?? null,
    set:    async (k, v, ...args) => { memStore.set(k, v); return 'OK'; },
    setex:  async (k, ttl, v)    => { memStore.set(k, v); return 'OK'; },
    del:    async (k)    => { memStore.delete(k); return 1; },
    exists: async (k)    => memStore.has(k) ? 1 : 0,
    expire: async ()     => 1,
    ping:   async ()     => 'PONG',
    isReady: false,
};

const connectRedis = () => {
    const url = process.env.REDIS_URL;

    if (!url) {
        console.warn('[Redis] REDIS_URL not set — using in-memory fallback cache');
        return fallback;
    }

    try {
        const client = new Redis(url, {
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            lazyConnect: true,
        });

        client.on('connect',  () => console.log('[Redis] ✅ Connected'));
        client.on('error',    (e) => console.error('[Redis] ❌ Error:', e.message));
        client.on('close',    () => console.warn('[Redis] Connection closed'));

        client.isReady = true;
        return client;
    } catch (err) {
        console.error('[Redis] Failed to initialise — using fallback:', err.message);
        return fallback;
    }
};

redisClient = connectRedis();

// ── Helper wrappers ───────────────────────────────────────────────────────────

/**
 * Cache a driver's live location (TTL = 30s — expires if driver goes offline)
 */
const cacheDriverLocation = async (driverId, lat, lng) => {
    const key = `driver:loc:${driverId}`;
    await redisClient.setex(key, 30, JSON.stringify({ lat, lng, ts: Date.now() }));
};

/**
 * Get a cached driver location
 */
const getDriverLocation = async (driverId) => {
    const raw = await redisClient.get(`driver:loc:${driverId}`);
    return raw ? JSON.parse(raw) : null;
};

/**
 * Store a JWT session entry (helps detect revoked tokens without DB round-trips)
 * TTL should match JWT expiry (seconds)
 */
const cacheSession = async (userId, token, ttlSeconds = 900) => {
    await redisClient.setex(`session:${userId}`, ttlSeconds, token);
};

const getSession = async (userId) =>
    redisClient.get(`session:${userId}`);

const invalidateSession = async (userId) =>
    redisClient.del(`session:${userId}`);

module.exports = {
    redis: redisClient,
    cacheDriverLocation,
    getDriverLocation,
    cacheSession,
    getSession,
    invalidateSession,
};
