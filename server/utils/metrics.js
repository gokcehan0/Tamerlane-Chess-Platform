/**
 * Prometheus-compatible Metrics
 * Simple metrics collection for monitoring
 */

// Metrics storage
const metrics = {
    // Counters
    moves_total: 0,
    moves_valid: 0,
    moves_invalid: 0,
    games_created: 0,
    games_finished: 0,
    
    // Gauges
    active_games: 0,
    connected_players: 0,
    
    // Histograms (simplified - just averages)
    move_latency_sum: 0,
    move_latency_count: 0,
    
    // Errors
    errors_total: 0,
    firebase_errors: 0,
    
    // Start time for uptime
    start_time: Date.now()
};

/**
 * Increment a counter
 */
function inc(name, value = 1) {
    if (metrics[name] !== undefined) {
        metrics[name] += value;
    }
}

/**
 * Decrement a counter (for gauges)
 */
function dec(name, value = 1) {
    if (metrics[name] !== undefined) {
        metrics[name] = Math.max(0, metrics[name] - value);
    }
}

/**
 * Set a gauge value
 */
function set(name, value) {
    if (metrics[name] !== undefined) {
        metrics[name] = value;
    }
}

/**
 * Record latency
 */
function recordLatency(name, ms) {
    const sumKey = `${name}_sum`;
    const countKey = `${name}_count`;
    if (metrics[sumKey] !== undefined) {
        metrics[sumKey] += ms;
        metrics[countKey]++;
    }
}

/**
 * Get all metrics in Prometheus text format
 */
function getPrometheusMetrics() {
    const lines = [];
    const prefix = 'tamerlane_';
    
    // Uptime
    const uptime = Math.floor((Date.now() - metrics.start_time) / 1000);
    lines.push(`# HELP ${prefix}uptime_seconds Server uptime in seconds`);
    lines.push(`# TYPE ${prefix}uptime_seconds gauge`);
    lines.push(`${prefix}uptime_seconds ${uptime}`);
    
    // Counters
    lines.push(`# HELP ${prefix}moves_total Total moves processed`);
    lines.push(`# TYPE ${prefix}moves_total counter`);
    lines.push(`${prefix}moves_total ${metrics.moves_total}`);
    lines.push(`${prefix}moves_valid ${metrics.moves_valid}`);
    lines.push(`${prefix}moves_invalid ${metrics.moves_invalid}`);
    
    lines.push(`# HELP ${prefix}games Total games`);
    lines.push(`# TYPE ${prefix}games counter`);
    lines.push(`${prefix}games_created ${metrics.games_created}`);
    lines.push(`${prefix}games_finished ${metrics.games_finished}`);
    
    // Gauges
    lines.push(`# HELP ${prefix}active_games Current active games`);
    lines.push(`# TYPE ${prefix}active_games gauge`);
    lines.push(`${prefix}active_games ${metrics.active_games}`);
    
    // Latency
    const avgLatency = metrics.move_latency_count > 0 
        ? (metrics.move_latency_sum / metrics.move_latency_count).toFixed(2) 
        : 0;
    lines.push(`# HELP ${prefix}move_latency_avg Average move processing time in ms`);
    lines.push(`# TYPE ${prefix}move_latency_avg gauge`);
    lines.push(`${prefix}move_latency_avg ${avgLatency}`);
    
    // Errors
    lines.push(`# HELP ${prefix}errors_total Total errors`);
    lines.push(`# TYPE ${prefix}errors_total counter`);
    lines.push(`${prefix}errors_total ${metrics.errors_total}`);
    lines.push(`${prefix}firebase_errors ${metrics.firebase_errors}`);
    
    // Memory
    const mem = process.memoryUsage();
    lines.push(`# HELP ${prefix}memory_bytes Memory usage`);
    lines.push(`# TYPE ${prefix}memory_bytes gauge`);
    lines.push(`${prefix}memory_heap_used_bytes ${mem.heapUsed}`);
    lines.push(`${prefix}memory_heap_total_bytes ${mem.heapTotal}`);
    
    return lines.join('\n');
}

/**
 * Get metrics as JSON
 */
function getMetrics() {
    return {
        ...metrics,
        uptime_seconds: Math.floor((Date.now() - metrics.start_time) / 1000),
        move_latency_avg_ms: metrics.move_latency_count > 0 
            ? (metrics.move_latency_sum / metrics.move_latency_count).toFixed(2) 
            : 0,
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };
}

/**
 * Reset metrics (for testing)
 */
function reset() {
    Object.keys(metrics).forEach(key => {
        if (key !== 'start_time') metrics[key] = 0;
    });
}

module.exports = {
    inc,
    dec,
    set,
    recordLatency,
    getPrometheusMetrics,
    getMetrics,
    reset,
    // Convenience
    moveProcessed: (valid, latencyMs) => {
        inc('moves_total');
        inc(valid ? 'moves_valid' : 'moves_invalid');
        recordLatency('move_latency', latencyMs);
    },
    gameCreated: () => { inc('games_created'); inc('active_games'); },
    gameFinished: () => { inc('games_finished'); dec('active_games'); },
    error: (firebase = false) => { inc('errors_total'); if (firebase) inc('firebase_errors'); }
};
