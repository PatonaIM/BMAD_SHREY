# Profile Edit Page Troubleshooting

## Quick Test

1. **Check if logged in:**
   - Go to `http://localhost:3000/api/auth/session`
   - Should show: `{"user":{"name":"...","email":"..."}}`
   - If shows `null`, you need to login first

2. **Check profile API:**
   - Open browser DevTools (F12)
   - Go to `http://localhost:3000/profile/edit`
   - Look at Network tab
   - Find the request to `/api/profile?computeCompleteness=true`
   - Check the Response:
     - `{"ok":false,"error":{"code":"UNAUTHORIZED"}}` → Not logged in
     - `{"ok":false,"error":{"code":"PROFILE_NOT_FOUND"}}` → No resume uploaded yet (this is expected!)
     - `{"ok":true,"value":{...}}` → Profile loaded successfully

## Expected Behavior

### If you HAVE NOT uploaded a resume:

- You'll see a nice error page that says:

  ```
  Profile Not Found

  No profile data

  To edit your profile, you first need to create one by uploading your resume.
  Our AI will extract the information and create your initial profile.

  [Upload Resume] [Go to Dashboard]
  ```

### If you HAVE uploaded a resume:

- The profile edit page should load with your extracted data

## To Fix (if no resume uploaded):

1. Go to `http://localhost:3000/profile/resume`
2. Upload your resume (PDF or DOC)
3. Wait for:
   - Upload progress (0-100%)
   - "AI is extracting your profile data..." (10-30 seconds)
   - "Profile extraction complete!" with skill/experience counts
4. Click "Edit Profile" button
5. Profile edit page should now work!

## Server Logs

Check terminal running `npm run dev` for log messages like:

```
{ event: 'profile_api_lookup', email: 'your@email.com' }
{ event: 'profile_api_user_found', userId: '...' }
{ event: 'profile_api_extracted_check', hasExtracted: false }
{ event: 'profile_api_no_profile', userId: '...' }
```

This tells you exactly what's happening.
