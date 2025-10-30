# User ID Session Fix

## Problem

The profile page was failing with "No profile data" error because the wrong userId was being stored in MongoDB. Instead of the actual MongoDB user ID, the NextAuth session ID was being stored.

## Root Cause

The issue occurred in the resume upload and extraction flow:

1. User uploads resume → `/api/profile/resume/upload`
2. Upload route uses `session.user.id` to store resume
3. Extract route uses `session.user.id` to save extracted profile
4. **For credentials users**, `session.user.id` was sometimes the session ID instead of the MongoDB user ID

The problem was in how different authentication methods set the `token.sub` field:

- **OAuth users**: `token.sub` was correctly set to MongoDB user ID in JWT callback
- **Credentials users**: `token.sub` was set to MongoDB user ID, but existing sessions had old tokens with session IDs

## Solution

### 1. Created `sessionHelpers.ts`

Created a centralized helper function that consistently retrieves userId:

```typescript
export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  // If session.user.id is set, use it
  if (session.user.id) {
    return session.user.id;
  }

  // Fallback: look up user by email (for old sessions)
  const user = await findUserByEmail(session.user.email);
  return user?._id || null;
}
```

### 2. Updated API Routes

Updated these routes to use `getSessionUserId()`:

- `/api/profile/resume/upload` - Resume upload
- `/api/profile/extract` - AI extraction
- `/api/profile/extraction-status` - Extraction polling

### 3. Fixed JWT Callback Comment

Updated the comment in `callbacks.ts` to clarify that `token.sub` is set for ALL auth methods (not just OAuth).

## Impact

**All users must log out and log back in** to get fresh JWT tokens with correct userId. Old sessions will continue to have issues until users re-authenticate.

## Files Changed

1. `src/auth/sessionHelpers.ts` - New helper file
2. `src/auth/callbacks.ts` - Updated comment
3. `src/app/api/profile/resume/upload/route.ts` - Use sessionHelper
4. `src/app/api/profile/extract/route.ts` - Use sessionHelper
5. `src/app/api/profile/extraction-status/route.ts` - Use sessionHelper

## Testing

1. **Fresh user test**:
   - Register new account with credentials
   - Upload resume
   - Verify profile loads at `/profile/edit`
   - Check MongoDB: `extracted_profiles` should have correct userId as `_id`

2. **Existing user test**:
   - Log out
   - Log back in
   - Upload new resume
   - Verify profile loads correctly

3. **OAuth user test**:
   - Sign in with Google/GitHub
   - Upload resume
   - Verify profile extraction works

## Database Cleanup

If there are documents in `extracted_profiles` with session IDs as `_id`, they need to be manually cleaned up:

```javascript
// MongoDB shell - find documents with session IDs (they look like random strings, not MongoDB ObjectIds)
db.extracted_profiles.find({ _id: { $not: /^[0-9a-f]{24}$/ } });

// Delete if needed (backup first!)
// db.extracted_profiles.deleteMany({ _id: { $not: /^[0-9a-f]{24}$/ } })
```

## Prevention

Going forward, **always use `getSessionUserId()`** in API routes instead of directly accessing `session.user.id`. This provides consistent behavior across authentication methods and handles edge cases with old sessions.
