# EP5-S3: Dynamic Contextual Question Orchestration

As an AI interviewer system,
I want to generate the next question on-the-fly using candidate answers, job description, and resume profile,
So that questioning adapts and remains relevant without precomputing a full list.

## Scope

- Context assembler merges latest answer summary + unresolved skill gaps
- Semantic gap detection: compare covered skill tokens vs job required tokens
- Difficulty tier progression logic (up/down based on last 2 evaluations)
- Domain quota enforcement (technical >=3, behavioral >=1, architecture >=1)
- Just-in-time prompt sent to OpenAI for next question formulation

## Acceptance Criteria

1. Next question only requested after previous answer end-of-turn event
2. Domain rotation respects unmet quotas before free selection
3. Difficulty escalates only after 2 consecutive strong answers (clarity & correctness >0.7)
4. Context prompt size capped (<4K tokens)
5. Each question event persisted with generation metadata (fragments used)
6. Fallback: if generation fails, use curated backup question bank
7. Technical roles bias technical domain selection frequency (+20%)

## Evaluation Heuristic (Initial)

```
score(answer) = 0.4*clarity + 0.4*correctness + 0.2*depth
clarity: structure, absence of rambling
correctness: alignment with canonical concepts
depth: specificity & examples
```

## Data Additions

`QuestionEventV2.generatedContextFragments[]` populated with IDs referencing stored context pieces (not raw text).

## Edge Cases

- Repeated weak answers → downgrade difficulty but avoid domain starvation
- Time cap near expiry → prioritize unfulfilled domain

## Tests

- Unit: domain quota resolver
- Unit: difficulty tier engine
- Integration: simulate 10-question run ensuring quotas satisfied

## Definition of Done

Adaptive loop generates relevant, quota-complete, difficulty-progressive questions without full pre-generation.
