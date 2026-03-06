/**
 * Circuit Breaker
 * Protects against cascading failures when Firebase is down
 */

const STATE = {
    CLOSED: 'CLOSED',       // Normal operation
    OPEN: 'OPEN',           // Failing, reject requests
    HALF_OPEN: 'HALF_OPEN'  // Testing if service recovered
};

class CircuitBreaker {
    constructor(options = {}) {
        this.name = options.name || 'default';
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
        this.halfOpenRequests = options.halfOpenRequests || 3;
        
        this.state = STATE.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = null;
        this.halfOpenAttempts = 0;
        
        // Statistics
        this.stats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            rejectedCalls: 0,
            stateChanges: 0
        };
    }
    
    /**
     * Execute function with circuit breaker protection
     */
    async execute(fn) {
        this.stats.totalCalls++;
        
        // Check if circuit should transition from OPEN to HALF_OPEN
        if (this.state === STATE.OPEN) {
            if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
                this._transition(STATE.HALF_OPEN);
            } else {
                this.stats.rejectedCalls++;
                throw new Error(`Circuit breaker ${this.name} is OPEN`);
            }
        }
        
        // In HALF_OPEN, limit requests
        if (this.state === STATE.HALF_OPEN) {
            if (this.halfOpenAttempts >= this.halfOpenRequests) {
                this.stats.rejectedCalls++;
                throw new Error(`Circuit breaker ${this.name} is HALF_OPEN, waiting for results`);
            }
            this.halfOpenAttempts++;
        }
        
        try {
            const result = await fn();
            this._onSuccess();
            return result;
        } catch (error) {
            this._onFailure();
            throw error;
        }
    }
    
    _onSuccess() {
        this.stats.successfulCalls++;
        this.failures = 0;
        
        if (this.state === STATE.HALF_OPEN) {
            this.successes++;
            if (this.successes >= this.halfOpenRequests) {
                this._transition(STATE.CLOSED);
            }
        }
    }
    
    _onFailure() {
        this.stats.failedCalls++;
        this.failures++;
        this.lastFailureTime = Date.now();
        
        if (this.state === STATE.HALF_OPEN) {
            this._transition(STATE.OPEN);
        } else if (this.failures >= this.failureThreshold) {
            this._transition(STATE.OPEN);
        }
    }
    
    _transition(newState) {
        if (this.state !== newState) {
            console.log(`🔌 Circuit ${this.name}: ${this.state} → ${newState}`);
            this.state = newState;
            this.stats.stateChanges++;
            
            if (newState === STATE.HALF_OPEN) {
                this.halfOpenAttempts = 0;
                this.successes = 0;
            } else if (newState === STATE.CLOSED) {
                this.failures = 0;
            }
        }
    }
    
    /**
     * Get circuit breaker status
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            failures: this.failures,
            lastFailure: this.lastFailureTime 
                ? new Date(this.lastFailureTime).toISOString() 
                : null,
            stats: this.stats
        };
    }
    
    /**
     * Force circuit to closed state (manual recovery)
     */
    reset() {
        this._transition(STATE.CLOSED);
        this.failures = 0;
        this.successes = 0;
    }
    
    /**
     * Check if circuit is allowing requests
     */
    isAvailable() {
        if (this.state === STATE.CLOSED) return true;
        if (this.state === STATE.OPEN) {
            return Date.now() - this.lastFailureTime >= this.resetTimeout;
        }
        return this.halfOpenAttempts < this.halfOpenRequests;
    }
}

// Pre-configured circuit breakers
const breakers = {
    firebase: new CircuitBreaker({ 
        name: 'firebase', 
        failureThreshold: 5, 
        resetTimeout: 30000 
    })
};

module.exports = {
    CircuitBreaker,
    breakers,
    getStatus: () => Object.fromEntries(
        Object.entries(breakers).map(([k, v]) => [k, v.getStatus()])
    )
};
