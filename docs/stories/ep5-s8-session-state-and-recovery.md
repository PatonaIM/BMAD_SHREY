# EP5-S8: Session State Machine & Recovery

As a system,
I want a deterministic session lifecycle with recovery capability,
So that transient failures do not corrupt interview progress.

## Scope

- Finite states: initializing → active → finalizing → completed | error
- Transitions guarded by validation rules
- In-memory store with periodic snapshot persistence
- Recovery routine on reload (if within grace period)

## Acceptance Criteria

1. State transitions logged with timestamp & reason
2. Recovery after page refresh (within 60s) restores: current question index, elapsed time
3. Illegal transition throws typed error (`INT_STATE_INVALID`)
4. Snapshot written every N events or 30s (configurable)
5. Finalizing state prevents new questions

## Tests

- Unit: transition table
- Integration: simulate recovery scenario

## Definition of Done

Robust state machine enabling reliable flow & limited recovery.
