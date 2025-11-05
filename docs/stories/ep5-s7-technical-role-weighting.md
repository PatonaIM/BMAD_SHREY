# EP5-S7: Technical Role Weighting Profiles

As a system,
I want configurable technical weighting profiles per role category,
So that scoring emphasizes relevant competencies.

## Scope

- Profile definitions (JSON / DB collection) mapping role → multipliers
- Resolver service selects profile by job role taxonomy
- Fallback default profile if role unmapped

## Acceptance Criteria

1. Profiles stored externally (e.g. `technicalWeightProfiles` collection)
2. Each profile: id, roleCategories[], multipliers { technical, communication, depth }
3. Resolver returns correct profile for provided jobId
4. Missing profile → default multipliers = 1.0
5. Logged profileId in InterviewSessionV2
6. Editing profile requires version bump & audit log

## Sample Profile

```json
{
  "id": "senior_engineer_v1",
  "roleCategories": ["senior_software_engineer", "backend_engineer"],
  "multipliers": { "technical": 1.3, "communication": 1.0, "depth": 1.1 },
  "version": 1,
  "updatedAt": "2025-11-05T00:00:00Z"
}
```

## Tests

- Unit: profile selection logic
- Unit: default fallback

## Definition of Done

Profiles influence scoring calculation and are auditable.
