/**
 * RideStateMachine — State Pattern for SAFORA ride lifecycle
 *
 * States:   requested → accepted → started → completed
 *                    ↘ cancelled (from any state before completed)
 *
 * This class enforces valid state transitions and prevents illegal moves
 * (e.g. jumping from 'requested' directly to 'completed').
 */

const STATES = {
    REQUESTED:  'requested',
    ACCEPTED:   'accepted',
    STARTED:    'started',
    COMPLETED:  'completed',
    CANCELLED:  'cancelled',
};

// Valid transitions: current state → allowed next states
const TRANSITIONS = {
    [STATES.REQUESTED]:  [STATES.ACCEPTED,  STATES.CANCELLED],
    [STATES.ACCEPTED]:   [STATES.STARTED,   STATES.CANCELLED],
    [STATES.STARTED]:    [STATES.COMPLETED, STATES.CANCELLED],
    [STATES.COMPLETED]:  [],   // terminal state
    [STATES.CANCELLED]:  [],   // terminal state
};

class RideStateMachine {
    constructor(currentState = STATES.REQUESTED) {
        if (!STATES[currentState.toUpperCase()]) {
            throw new Error(`Invalid initial state: ${currentState}`);
        }
        this.state = currentState;
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    getState()            { return this.state; }
    isTerminal()          { return TRANSITIONS[this.state].length === 0; }
    canTransitionTo(next) { return TRANSITIONS[this.state].includes(next); }

    // ── Transition ────────────────────────────────────────────────────────────

    transition(nextState) {
        if (!this.canTransitionTo(nextState)) {
            throw new Error(
                `Invalid transition: ${this.state} → ${nextState}. ` +
                `Allowed: [${TRANSITIONS[this.state].join(', ')}]`
            );
        }
        const previous = this.state;
        this.state = nextState;
        return { previous, current: this.state };
    }

    // ── Convenience methods ────────────────────────────────────────────────────

    accept()   { return this.transition(STATES.ACCEPTED); }
    start()    { return this.transition(STATES.STARTED); }
    complete() { return this.transition(STATES.COMPLETED); }
    cancel()   { return this.transition(STATES.CANCELLED); }

    // ── Static factory ────────────────────────────────────────────────────────

    static fromRide(ride) {
        return new RideStateMachine(ride.status);
    }

    static validateTransition(currentStatus, nextStatus) {
        const allowed = TRANSITIONS[currentStatus];
        if (!allowed) throw new Error(`Unknown state: ${currentStatus}`);
        if (!allowed.includes(nextStatus)) {
            throw new Error(
                `Ride cannot move from '${currentStatus}' to '${nextStatus}'`
            );
        }
        return true;
    }
}

module.exports = { RideStateMachine, STATES };
