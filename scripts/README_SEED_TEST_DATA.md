# Test Data Seeding Script

This script populates the database with test users, resumes, and job applications for development and testing purposes.

## What It Does

1. **Creates 100 test users** with a default password
2. **Generates realistic text resumes** with dummy data including:
   - Professional summary
   - Skills (randomly selected from tech stack)
   - Work experience (scaled to years of experience)
   - Education
   - Certifications
3. **Uploads resumes via API** to trigger extraction and vectorization
4. **Randomly selects 10 jobs** from existing active jobs in the database
5. **Submits applications via API** with 8-12 randomly selected users per job
6. **Triggers full pipeline**: Resume extraction, vectorization, and match scoring

## Prerequisites

- **MongoDB must be running** and accessible
- **Next.js server must be running** on port 3000 (or configured API_BASE_URL)
- **Jobs must already exist** in the database (run job sync or seed jobs first)
- Azure Storage configured if using Azure (or local storage will be used)
- Environment variables properly configured (NEXTAUTH_SECRET, etc.)

## Usage

### Step 1: Start Your Development Server

**In one terminal:**

```bash
npm run dev
```

### Step 2: Run the Seeding Script

**In another terminal:**

**Default (100 users, 10 jobs):**

```bash
npm run seed:test-data
```

**Custom amounts:**

```bash
npm run seed:test-data -- --users=50 --jobs=5
```

Parameters:

- `--users=N` - Number of test users to create (default: 100)
- `--jobs=N` - Number of jobs to apply to (default: 10)

## Test User Credentials

All test users are created with:

- **Email pattern**: `firstname.lastname.N@testuser.com`
- **Password**: `test123`

### Examples:

- `james.smith.0@testuser.com`
- `mary.johnson.1@testuser.com`
- `john.williams.2@testuser.com`

## Generated Data

### Resume Contents

Each resume includes:

- **Contact Information**: Name, email, phone, location
- **Professional Summary**: Experience-appropriate summary
- **Skills**: 6-12 randomly selected skills from tech stack
- **Experience**: 1-4 jobs based on years of experience
- **Education**: Degree from a university
- **Certifications**: AWS and Scrum certifications
- **Languages**: English and Spanish

### Application Distribution

- Each selected job receives 8-12 applications
- Users are randomly distributed across jobs
- Duplicate applications are prevented

## Expected Output

The script provides detailed progress updates:

```
🌱 Starting test data seeding...

Configuration:
  - Users to create: 100
  - Jobs to apply to: 10
  - Applications per job: 8-12
  - Default password: test123
  - API URL: http://localhost:3000

⚠️  IMPORTANT: Make sure your Next.js server is running at http://localhost:3000
   Run 'npm run dev' in another terminal before starting this script.

📝 Step 1: Creating 100 users with resumes...
  ✓ Created 10/100 users
  ✓ Created 20/100 users
  ...
✓ Created 100 users with resumes

🎯 Step 2: Selecting 10 random jobs...
✓ Selected 10 jobs:
  1. Software Engineer at Tech Co
  2. Frontend Developer at Digital Inc
  ...

📤 Step 3: Creating applications...
  Applying 12 users to: Software Engineer
  Applying 9 users to: Frontend Developer
  ...

✓ Created 105 applications

🎉 Seeding complete!

Summary:
  - Users created: 100
  - Jobs selected: 10
  - Applications created: 105
  - Average applications per job: 10.5
```

## How It Works (Technical Flow)

### Resume Upload & Processing

1. Generate realistic text resume
2. **POST /api/profile/resume/upload** - Upload resume file
3. **POST /api/profile/extract** - Extract profile data using AI
4. Vectorization happens automatically after extraction

### Application Submission

1. **POST /api/applications/submit** - Submit application
2. Vector similarity matching happens automatically
3. Match score calculated and stored
4. Initial stages created (submit_application, ai_interview)
5. Recruiter notifications sent if subscribed

### Authentication

- Uses JWT session tokens for API authentication
- Creates session cookies automatically for each user
- Mimics real user authentication flow

## Idempotency

The script is idempotent:

- If a user already exists (same email), it will be skipped
- If an application already exists, it will be skipped
- Safe to run multiple times

## Common Use Cases

### Testing Recruiter Dashboard

```bash
# Create many applications to test pagination and filtering
npm run seed:test-data -- --users=200 --jobs=20
```

### Quick Testing

```bash
# Create just a few users for quick tests
npm run seed:test-data -- --users=10 --jobs=3
```

### Load Testing

```bash
# Create many users and applications for performance testing
npm run seed:test-data -- --users=500 --jobs=50
```

## Cleanup

To remove test data:

```bash
# Reset the entire database (USE WITH CAUTION)
npm run dev:reset-db
```

Or manually delete test users via MongoDB:

```javascript
// In MongoDB shell or Compass
db.users.deleteMany({ email: /testuser\.com$/ })
db.applications.deleteMany({ candidateEmail: /testuser\.com$/ })
db.resumes.deleteMany({ _id: { $in: /* user IDs */ } })
```

## Troubleshooting

### "ECONNREFUSED" or "fetch failed"

The Next.js server is not running. Make sure to:

```bash
# In a separate terminal
npm run dev
```

### "No active jobs found"

Make sure to seed or sync jobs first:

```bash
# Sync from Workable (if configured)
# Access your running app at http://localhost:3000
# Or seed sample jobs via API endpoint
```

### Storage errors

- Check Azure Storage configuration in `.env`
- Or ensure local storage directory has write permissions

### MongoDB connection errors

- Verify `MONGODB_URI` in `.env`
- Ensure MongoDB is running

### Authentication errors

- Check `NEXTAUTH_SECRET` is set in `.env`
- Make sure the secret matches what the server is using

## Script Architecture

The script uses:

- **API-driven approach**: Calls actual API endpoints instead of direct DB access
- **JWT authentication**: Creates session tokens for each user
- **formdata-node**: For multipart file uploads
- **Native fetch**: For HTTP requests
- **bcryptjs**: For password hashing
- Existing repository patterns for user and job management

### API Endpoints Used:

- `POST /api/profile/resume/upload` - Resume file upload
- `POST /api/profile/extract` - AI extraction (triggers vectorization)
- `POST /api/applications/submit` - Application submission (triggers scoring)

### Why API Approach?

- **Triggers full pipeline**: Extraction, vectorization, scoring happen automatically
- **Realistic testing**: Uses the same flow as real users
- **Complete data**: Applications have match scores, vectors, and stages
- **Proper validation**: All API validations and business logic execute

## Integration

This script integrates with:

- User repository (`userRepo`)
- Resume repository (`resumeRepo`)
- Job repository (`jobRepo`)
- Application repository (`applicationRepo`)
- Storage service (`resumeStorage`)

All using the same APIs as the actual application, ensuring data consistency.
