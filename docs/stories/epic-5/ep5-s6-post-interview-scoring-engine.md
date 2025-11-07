# EP5-S6: Post-Interview Scoring Engine

As the platform,
I want to compute a structured score reflecting technical capability, communication, and overall performance,
So that applications receive a meaningful interview-based boost.

## Scope

- Aggregate per-question evaluations into domain scores
- Apply technical weighting based on role profile
- Compute boost delta (non-linear: diminishing returns at high baseline)
- Persist `ScoreReportV2` and update Application

## Acceptance Criteria

1. Domain scores calculated: technical, communication, adaptability (optional), overall
2. Weighted final respects role-specific multipliers (e.g. technical 1.3 for senior engineer)
3. Boost formula: `boost = f(finalScore, baselineScore)` with cap (e.g. ≤15 points)
4. Processing completes <20s after interview end (target <10s)
5. Idempotent (re-run does not duplicate boost) with scoreReportId linkage
6. Transparent breakdown returned to UI

## Initial Formula (Draft)

```
raw = 0.5*technical + 0.3*communication + 0.2*(avg clarity + depth)
adjusted = raw * technicalMultiplier(role)
boost = min( round(adjusted/10), 15 ) // placeholder
final = clamp(baseline + boost, 0, 100)
```

## Edge Cases

- Missing evaluations (connection issues) → exclude from average gracefully
- Extremely short interview (<5 min) → mark partial & reduce boost potential

## Tests

- Unit: weighting function
- Unit: boost calculation boundaries
- Integration: sample dataset calibration

## Definition of Done

Deterministic scoring with documented formula & application update.
