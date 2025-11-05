# Avatar Assets

## ReadyPlayerMe Avatar Setup

This directory should contain the GLB avatar model used for the AI interviewer.

### Option 1: Use ReadyPlayerMe Studio (Recommended for MVP)

1. Visit [ReadyPlayerMe](https://readyplayer.me/)
2. Create a professional-looking avatar (business casual attire recommended)
3. Download the GLB model with these settings:
   - Quality: Medium
   - Pose: A-pose or T-pose
   - Format: GLB
4. Save the file as `interviewer.glb` in this directory

### Option 2: Direct API Download

Use the ReadyPlayerMe API to fetch a pre-configured avatar:

```bash
# Example avatar ID (replace with your own)
curl -o interviewer.glb "https://models.readyplayer.me/64bfa3f0b1b5e9000d5e4a1c.glb?quality=medium&pose=A"
```

### Required File

- **interviewer.glb** - Main avatar model (2-5MB recommended)

### Fallback

If no GLB is present, the application will display a static placeholder image with a speaking indicator.

### Technical Requirements

- Format: GLB (binary glTF)
- Recommended size: 2-5MB
- Should include morph targets for facial animations (mouth_open, blink, etc.)
- Rigged with standard humanoid skeleton

---

**Note**: For production, consider hosting avatars on a CDN for better performance.
