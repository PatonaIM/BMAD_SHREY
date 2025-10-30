# Profile Creation API

This API endpoint allows users to generate their professional profile by extracting data from their uploaded resume using AI.

## Endpoints

### POST `/api/profile/create-from-resume`

Creates or regenerates a user's profile from their latest resume.

**Authentication**: Required (session-based)

**Request Body** (optional):

```json
{
  "resumeVersionId": "string",  // Optional: specific resume version to use
  "forceRegenerate": boolean     // Optional: regenerate even if profile exists (default: false)
}
```

**Success Response** (200):

```json
{
  "ok": true,
  "value": {
    "userId": "string",
    "resumeVersionId": "string",
    "extractionStatus": "completed",
    "skillCount": 15,
    "experienceCount": 3,
    "educationCount": 1,
    "extractedAt": "2025-10-30T12:00:00.000Z",
    "costEstimate": 25,
    "summary": "Experienced software engineer with...",
    "message": "Profile created successfully"
  }
}
```

**Error Responses**:

- `401`: Authentication required
- `404`: User not found / No resume uploaded
- `500`: Server error during extraction

**Example Usage**:

```typescript
// Create profile from latest resume
const response = await fetch('/api/profile/create-from-resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});

// Force regenerate profile
const response = await fetch('/api/profile/create-from-resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ forceRegenerate: true }),
});

// Use specific resume version
const response = await fetch('/api/profile/create-from-resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ resumeVersionId: 'abc-123' }),
});
```

### GET `/api/profile/create-from-resume`

Checks the current status of a user's profile and resume.

**Authentication**: Required (session-based)

**Success Response** (200):

```json
{
  "ok": true,
  "value": {
    "hasProfile": true,
    "hasResume": true,
    "profileInfo": {
      "resumeVersionId": "string",
      "extractionStatus": "completed",
      "skillCount": 15,
      "experienceCount": 3,
      "educationCount": 1,
      "extractedAt": "2025-10-30T12:00:00.000Z"
    },
    "resumeInfo": {
      "currentVersionId": "string",
      "versionCount": 2,
      "latestFileName": "resume.pdf"
    }
  }
}
```

**Example Usage**:

```typescript
const response = await fetch('/api/profile/create-from-resume');
const data = await response.json();

if (data.value.hasProfile) {
  console.log(
    'Profile exists with',
    data.value.profileInfo.skillCount,
    'skills'
  );
}
```

## UI Components

### `CreateProfileFromResume`

A React component providing a complete UI for profile creation.

**Features**:

- Check profile/resume status
- Create new profile
- Force regenerate existing profile
- Display extraction results (skills, experience, education counts)
- Show AI cost estimates
- Link to profile editor

**Usage**:

```tsx
import { CreateProfileFromResume } from '@/components/CreateProfileFromResume';

export default function ProfileCreationPage() {
  return <CreateProfileFromResume />;
}
```

## Data Flow

```
User → POST /api/profile/create-from-resume
  ↓
1. Authenticate user session
  ↓
2. Get user's latest resume document
  ↓
3. Extract resume file from storage
  ↓
4. Call ResumeExtractionService (AI extraction)
  ↓
5. Parse structured data (skills, experience, education)
  ↓
6. Store ExtractedProfile in MongoDB
  ↓
7. Return extraction results to user
```

## Cost Estimates

- Average cost per profile extraction: **$0.15 - $0.30**
- Maximum allowed cost per extraction: **$0.30**
- Cost depends on resume length and complexity

## Related Endpoints

- `GET /api/profile` - Get user's editable profile
- `PUT /api/profile` - Update profile with manual edits
- `POST /api/profile/vectorize` - Generate vector embeddings
- `GET /api/profile/versions` - List profile version history

## Example Integration

```tsx
// Example: Dashboard integration
function DashboardProfileSection() {
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    fetch('/api/profile/create-from-resume')
      .then(res => res.json())
      .then(data => setHasProfile(data.value.hasProfile));
  }, []);

  if (!hasProfile) {
    return (
      <div>
        <p>Create your profile to start matching with jobs</p>
        <button onClick={createProfile}>Create Profile</button>
      </div>
    );
  }

  return <ProfileSummary />;
}
```

## Error Handling

The API uses consistent error responses:

```json
{
  "ok": false,
  "error": "Error message description"
}
```

Common errors:

- `"Authentication required"` - User not logged in
- `"User not found"` - Email not found in database
- `"No resume found. Please upload a resume first."` - User has no resume uploaded
- `"Resume version {id} not found"` - Invalid version ID specified
- `"Profile creation failed: {reason}"` - AI extraction error

## Logging

All operations are logged with the following events:

- `profile_creation_started`
- `profile_already_exists`
- `profile_extraction_starting`
- `profile_creation_completed`
- `profile_creation_failed`

Logs include:

- Truncated user ID (first 8 chars for privacy)
- Resume version ID
- Duration in milliseconds
- Extraction counts (skills, experience, education)
- AI cost in cents

## Testing

Manual testing checklist:

1. ✓ Test with authenticated user
2. ✓ Test without authentication (should return 401)
3. ✓ Test with user who has no resume (should return 404)
4. ✓ Test profile creation from latest resume
5. ✓ Test with existing profile (should return existing data)
6. ✓ Test force regenerate flag
7. ✓ Test specific resume version selection
8. ✓ Verify cost estimates are within limits
9. ✓ Check extracted data quality (skills, experience, education)
10. ✓ Verify MongoDB storage of extracted profile

## Next Steps

After profile creation, users can:

1. **Edit Profile**: Navigate to `/profile/edit` to refine AI-extracted data
2. **Vectorize Profile**: Generate embeddings for semantic job matching
3. **Match Jobs**: Use profile to find relevant job opportunities
4. **View History**: Check profile version history and restore previous versions
