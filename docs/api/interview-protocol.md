# Realtime Interview Control Channel Protocol

This document defines the JSON event schema exchanged over the WebRTC DataChannel between the client and the AI interviewer model.

## Overview

We use lightweight JSON messages (one object per message) to coordinate interview flow, adaptive questioning, and scoring. Messages are divided into two categories:

- Client → Model (control commands)
- Model → Client (interview events)

The model receives protocol instructions in the session `instructions` at ephemeral token creation, enabling it to interpret control events and emit corresponding interview events.

## Client → Model Events

| Type                   | Purpose                                                                     | Required Payload                       |
| ---------------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| `client.start`         | Candidate indicates readiness; model should greet and request introduction. | `{ note?: string }` (ignored by model) |
| `client.request_score` | Candidate requests final scoring and completion.                            | `{ breakdownRequested?: boolean }`     |

## Model → Client Events

| Type              | Purpose                                        | Payload Shape                                                                           |
| ----------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `interview.greet` | Greeting + request for introduction.           | `{ message: string }`                                                                   |
| `question.ready`  | New interview question prepared.               | `{ idx: number, topic: string, difficulty?: number }`                                   |
| `ai.state`        | Indicates speaking state transitions.          | `{ speaking: boolean }`                                                                 |
| `interview.score` | Final numeric score + rubric breakdown.        | `{ score: number, breakdown: { clarity: number, correctness: number, depth: number } }` |
| `interview.done`  | Terminal event signaling interview completion. | `{}`                                                                                    |

## Lifecycle

1. Client obtains permissions and establishes WebRTC connection.
2. Client sends `client.start`.
3. Model emits `interview.greet`.
4. Candidate responds verbally; model then emits first `question.ready` (idx=0).
5. For each answer, model may emit follow-up `question.ready` with incremented `idx`.
6. Client eventually sends `client.request_score`.
7. Model emits `interview.score` followed by `interview.done`.

## Rules

- `question.ready` MUST NOT be emitted before `interview.greet`.
- `interview.score` MUST follow a `client.request_score` event.
- `interview.done` MUST follow `interview.score`.
- Difficulty may adjust: start at tier 3 (moderate), escalate if answers are strong, reduce if struggling.
- Keep each JSON message self-contained; do not bundle multiple event types.
- Avoid including protocol description text inside normal interview dialogue.

## Error Handling

If malformed JSON arrives, client ignores. If an unexpected sequence occurs (e.g. `interview.score` without prior `client.request_score`) the client may log a protocol warning and ignore.

## Extensibility

Future model → client events can include:

- `hint.offer` for optional hints.
- `feedback.partial` mid-interview formative feedback.

They should follow the same one-event-per-message rule.

## Example Sequence

```json
{ "type": "client.start", "ts": 1730820000000, "payload": {} }
{ "type": "interview.greet", "ts": 1730820001200, "payload": { "message": "Welcome. Please introduce yourself." } }
{ "type": "question.ready", "ts": 1730820010000, "payload": { "idx": 0, "topic": "system design", "difficulty": 3 } }
{ "type": "ai.state", "ts": 1730820010500, "payload": { "speaking": true } }
{ "type": "client.request_score", "ts": 1730820100000, "payload": { "breakdownRequested": true } }
{ "type": "interview.score", "ts": 1730820105000, "payload": { "score": 82, "breakdown": { "clarity": 0.78, "correctness": 0.85, "depth": 0.70 } } }
{ "type": "interview.done", "ts": 1730820106000, "payload": {} }
```

## Versioning

Protocol changes should update this doc and append a short CHANGELOG section. Embed version tag inside session instructions if divergence becomes necessary, e.g. `protocol_version:1`.

---

Maintained by EP5 Interview V2 implementation.
