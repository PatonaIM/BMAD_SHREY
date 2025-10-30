# Profile Edit Page Debugging Guide

## Common Issues & Solutions

### 1. Check Browser Console

Open browser DevTools (F12 or Cmd+Option+I) and navigate to `/profile/edit`:

- Look for JavaScript errors in Console tab
- Check Network tab for failed API calls
- Look for 401 (Unauthorized) or 404 (Not Found) errors

### 2. Check Authentication

```bash
# Verify you're logged in
# Go to /api/auth/session in browser
# Should return user session data
```

### 3. Test API Endpoint Directly

```bash
# Test GET /api/profile (requires authentication)
curl http://localhost:3000/api/profile?computeCompleteness=true \
  -H "Cookie: YOUR_SESSION_COOKIE"
```

### 4. Check Database Connection

```bash
# Verify MongoDB connection string in .env.local
MONGODB_URI=mongodb+srv://...
```

### 5. Check if Profile Exists

The page requires either:

- An extracted profile from resume upload, OR
- A saved profile version

If you haven't uploaded a resume yet:

1. Go to `/profile/resume` or `/resume`
2. Upload a resume first
3. Wait for AI extraction to complete
4. Then try `/profile/edit` again

### 6. Check Server Logs

Look at the terminal running `npm run dev` for:

- MongoDB connection errors
- API route errors
- Authentication errors

### 7. Temporary Fix: Create Test Profile

If you need to bypass resume upload for testing, add a manual profile creation:

```typescript
// In /api/profile/route.ts, temporarily add after user lookup:
// Create a dummy profile if none exists
if (!profileSource) {
  profileSource = {
    userId: user._id,
    summary: 'Test profile',
    skills: [],
    experience: [],
    education: [],
  };
}
```

## Quick Diagnostic Steps

1. **Is the page completely blank?**
   - Check browser console for React errors
   - Verify Next.js dev server is running

2. **Shows "Loading profile..."?**
   - API call is taking too long or failing
   - Check Network tab for `/api/profile` status

3. **Shows "No profile found" error?**
   - You need to upload a resume first
   - Or there's an issue with profile extraction

4. **Shows Unauthorized error?**
   - Not logged in
   - Session expired
   - Go to `/login` first

## What Error Are You Seeing?

Please provide:

1. Exact error message shown on page
2. Browser console errors (if any)
3. Network tab status codes for `/api/profile` call
4. Have you uploaded a resume yet?
