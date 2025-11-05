# EP5-S5: Chunked Recording Upload to Azure Storage

As a system,
I want to upload recording data in resilient chunks during the interview,
So that large sessions are safely persisted without data loss.

## Scope

- MediaRecorder `dataavailable` event chunk queue
- Chunk metadata: index, size, sha256 hash, timestamp
- Upload worker with exponential backoff on failure
- SAS token renewal before expiry
- Finalization step verifying sequential integrity then writing manifest

## Acceptance Criteria

1. Each chunk uploaded with content hash; server validates & stores
2. Retry policy: 3 attempts with backoff (1s, 3s, 7s) then mark session error if unrecoverable
3. Manifest file lists ordered chunk references + cumulative size
4. Finalization only after all chunks acked
5. Upload progress UI updates every chunk (not more than 250ms frequency)
6. Partial failure logged with error code `INT_CHUNK_UPLOAD_FAIL` & recover attempt
7. Integrity check ensures no missing indexes (0..N-1)

## Data

Manifest sample:

```json
{
  "sessionId": "...",
  "chunks": [
    { "i": 0, "size": 524288, "sha": "abc" },
    { "i": 1, "size": 497123, "sha": "def" }
  ],
  "totalSize": 1021400,
  "mime": "video/webm",
  "composite": true,
  "resolution": "1280x720",
  "createdAt": "2025-11-05T12:00:00Z"
}
```

## Edge Cases

- Token expiry mid-upload → renew & resume
- Last chunk extremely small (<10KB) → still uploaded & included

## Tests

- Unit: backoff logic
- Unit: manifest builder
- Integration: simulate lost chunk + retry success

## Definition of Done

Reliable chunked upload with manifest finalization and error resilience.
