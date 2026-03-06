/**
 * In-Memory Game Cache
 * TTL-based cache for active games to reduce Firebase reads
 */

const cache = new Map();
const TTL = 30 * 60 * 1000; // 30 minutes
const MAX_SIZE = 1000; // Maximum cached games

// Statistics for monitoring
let stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0
};

/**
 * Get cached game data
 * @param {string} roomId 
 * @returns {object|null}
 */
function get(roomId) {
    const entry = cache.get(roomId);
    if (!entry) {
        stats.misses++;
        return null;
    }
    
    // Check TTL
    if (Date.now() > entry.expires) {
        cache.delete(roomId);
        stats.misses++;
        return null;
    }
    
    stats.hits++;
    return entry.data;
}

/**
 * Set game data in cache
 * @param {string} roomId 
 * @param {object} data 
 */
function set(roomId, data) {
    // Evict oldest entries if at capacity
    if (cache.size >= MAX_SIZE) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
    
    cache.set(roomId, {
        data: data,
        expires: Date.now() + TTL,
        lastAccess: Date.now()
    });
    stats.sets++;
}

/**
 * Invalidate (remove) cached game
 * @param {string} roomId 
 */
function invalidate(roomId) {
    if (cache.has(roomId)) {
        cache.delete(roomId);
        stats.invalidations++;
    }
}

/**
 * Cleanup expired entries
 */
function cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, val] of cache) {
        if (val.expires < now) {
            cache.delete(key);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
}

/**
 * Get cache statistics
 */
function getStats() {
    const hitRate = stats.hits + stats.misses > 0 
        ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)
        : 0;
    
    return {
        size: cache.size,
        maxSize: MAX_SIZE,
        ttlMinutes: TTL / 60000,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: `${hitRate}%`,
        sets: stats.sets,
        invalidations: stats.invalidations
    };
}

/**
 * Clear all cache
 */
function clear() {
    cache.clear();
    stats = { hits: 0, misses: 0, sets: 0, invalidations: 0 };
    console.log('🧹 Cache cleared');
}

// Run cleanup every 5 minutes
const cleanupInterval = setInterval(cleanup, 5 * 60 * 1000);

// Cleanup function for graceful shutdown
function shutdown() {
    clearInterval(cleanupInterval);
    cache.clear();
    console.log('🧹 Cache shutdown complete');
}

module.exports = {
    get,
    set,
    invalidate,
    cleanup,
    getStats,
    clear,
    shutdown
};
