# Camera/Microphone Permission Debugging Guide

## Issue

Browser doesn't show permission prompt for camera/microphone when starting an interview. Getting "Permission denied" error without user interaction.

## Debugging Steps

### 1. Restart Dev Server

The `next.config.js` changes need a server restart to take effect:

```bash
# Kill current dev server (Ctrl+C)
npm run dev
```

### 2. Check Console Logs

I've added extensive logging to help diagnose the issue. Open browser DevTools Console and look for:

**Expected logs when clicking "Request Permissions":**

```
[PermissionCheck] Current permission states: { camera: "prompt", microphone: "prompt" }
[PermissionCheck] Requesting permissions from manager...
[VideoRecording] Requesting permissions... { userAgent: "...", hasMediaDevices: true, hasGetUserMedia: true, protocol: "http:", origin: "http://localhost:3000" }
[VideoRecording] Constraints: { video: {...}, audio: {...} }
[VideoRecording] Permissions granted { streamId: "...", tracks: [...] }
[PermissionCheck] Permissions granted successfully
```

**What to look for in the logs:**

- **hasMediaDevices: false** → Browser doesn't support WebRTC
- **hasGetUserMedia: false** → getUserMedia API not available
- **protocol: "http:"** → Check if hostname is localhost (required for HTTP)
- **Permission states "denied"** → User previously denied, need to reset browser permissions

### 3. Verify Permissions-Policy Headers

Open DevTools Network tab:

1. Navigate to an interview page: `/interview/[some-session-id]`
2. Find the document request (the page itself)
3. Click on it and check **Response Headers**
4. Look for: `Permissions-Policy: camera=(self), microphone=(self), display-capture=(self)`

**If header is missing or shows `camera=(), microphone=()`:**

- Server didn't restart properly
- next.config.js changes didn't apply
- Route pattern not matching (should be `/interview/:path*`)

### 4. Check Browser Console for Violations

Look for error messages like:

```
Permissions policy violation: camera is not allowed in this document.
Permissions policy violation: microphone is not allowed in this document.
```

If you see these, the Permissions-Policy is still blocking despite our changes.

### 5. Verify Secure Context

getUserMedia requires HTTPS **OR** localhost. Check:

- URL should be `http://localhost:3000` or `https://...`
- NOT `http://192.168.x.x` or `http://[your-computer-name]`

If accessing via IP address, getUserMedia will fail with SecurityError.

### 6. Check Current Permission State

Before clicking "Request Permissions", open DevTools Console and run:

```javascript
navigator.permissions.query({ name: 'camera' }).then(result => {
  console.log('Camera permission:', result.state); // 'granted', 'denied', 'prompt'
});

navigator.permissions.query({ name: 'microphone' }).then(result => {
  console.log('Microphone permission:', result.state);
});
```

**If state is "denied":**
The browser has cached a previous denial. Reset it:

**Chrome/Edge:**

1. Click the lock icon in address bar
2. Click "Site settings"
3. Find Camera and Microphone
4. Change from "Block" to "Ask"

**Firefox:**

1. Click the lock icon in address bar
2. Click "Connection secure" > "More information"
3. Go to "Permissions" tab
4. Find "Use the Camera" and "Use the Microphone"
5. Uncheck "Use default" and select "Allow"

**Safari:**

1. Safari menu > Settings > Websites
2. Find Camera and Microphone
3. Set to "Ask" or "Allow"

### 7. Check for Conflicting Browser Extensions

Some privacy/security extensions block getUserMedia:

- Disable extensions temporarily
- Try in an incognito/private window
- Check extension settings for camera/microphone blocking

### 8. Test with Simple getUserMedia Call

Open DevTools Console and run this directly:

```javascript
navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then(stream => {
    console.log('SUCCESS! Stream:', stream);
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => {
    console.error('FAILED:', err.name, err.message);
  });
```

This should trigger the browser permission prompt. If it doesn't:

- Browser permissions are denied and cached
- Permissions-Policy is blocking
- Browser doesn't support getUserMedia

## Error Codes Reference

| Error Name           | Meaning                       | Solution                                                   |
| -------------------- | ----------------------------- | ---------------------------------------------------------- |
| NotAllowedError      | User or browser policy denied | Reset browser permissions, check Permissions-Policy header |
| NotFoundError        | No camera/mic detected        | Connect a device, check system settings                    |
| NotReadableError     | Device already in use         | Close other apps using camera/mic                          |
| OverconstrainedError | Constraints too strict        | Device doesn't meet requirements (e.g., 1280x720)          |
| SecurityError        | Permissions-Policy blocking   | Check headers, verify secure context (HTTPS/localhost)     |
| TypeError            | Browser compatibility         | Use modern browser (Chrome, Firefox, Edge)                 |

## Next Steps After Fixing

Once you see the browser permission prompt and can grant access:

1. Test the full interview flow
2. Verify video recording starts
3. Check audio levels are detected
4. Confirm video uploads to Azure Blob Storage
5. Proceed to Epic 3 Sprint 4 (Q&A transcription)

## Still Not Working?

Share the following from DevTools Console:

1. All `[VideoRecording]` and `[PermissionCheck]` logs
2. Network tab Response Headers for `/interview/[sessionId]` page
3. Any error messages in Console
4. Result of manual `getUserMedia()` test (step 8)
5. Browser name and version
6. Operating system

This will help diagnose the exact blocker.
