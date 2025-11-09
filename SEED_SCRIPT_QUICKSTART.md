# Test Data Seeding Script - Quick Start

## What Was Created

A comprehensive script to populate your database with test data using actual API endpoints to trigger the full pipeline (extraction, vectorization, scoring).

### Files Created:

1. **`scripts/seed-test-data.ts`** - Main seeding script (API-driven)
2. **`scripts/README_SEED_TEST_DATA.md`** - Detailed documentation
3. **Updated `package.json`** - Added `seed:test-data` npm script

## Quick Start

### Prerequisites

1. MongoDB must be running
2. **Next.js server must be running** (`npm run dev`)
3. Jobs must exist in database (run job sync or seed jobs first)

### Run the Script

**Step 1 - Start server (in one terminal):**

```bash
npm run dev
```

**Step 2 - Run script (in another terminal):**

**Default (100 users, 10 jobs):**

```bash
npm run seed:test-data
```

**Custom amounts:**

```bash
npm run seed:test-data -- --users=50 --jobs=5
```

## What It Does

1. ✅ Creates 100 test users with password: `test123`
2. ✅ Generates realistic text resumes for each user
3. ✅ **Uploads via API** → triggers AI extraction
4. ✅ **Extraction** → triggers vectorization automatically
5. ✅ Randomly picks 10 jobs from database
6. ✅ **Submits applications via API** → triggers match scoring
7. ✅ Creates 8-12 applications per job with full pipeline

## Test User Login

- **Email pattern**: `firstname.lastname.N@testuser.com`
- **Password**: `test123`
- **Examples**:
  - `james.smith.0@testuser.com`
  - `mary.johnson.1@testuser.com`
  - `john.williams.2@testuser.com`

## Generated Resume Content

Each resume includes:

- Contact information (name, email, phone, city)
- Professional summary based on experience
- 6-12 technical skills
- 1-4 jobs in work history
- University education
- AWS and Scrum certifications

## Expected Output

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

## Key Features

- ✅ **Full Pipeline**: Uses APIs to trigger extraction, vectorization, and scoring
- ✅ **Realistic Data**: Applications have match scores and vector embeddings
- ✅ **Idempotent**: Safe to run multiple times
- ✅ **Random distribution**: Users randomly assigned to jobs
- ✅ **Progress tracking**: Shows detailed progress during execution
- ✅ **Configurable**: Customize user count and job count via CLI args

### Testing Recruiter Dashboard

```bash
npm run seed:test-data -- --users=200 --jobs=20
```

### Quick Testing

```bash
npm run seed:test-data -- --users=10 --jobs=3
```

### Load Testing

```bash
npm run seed:test-data -- --users=500 --jobs=50
```

## Features

- ✅ **Idempotent**: Safe to run multiple times
- ✅ **Random distribution**: Users randomly assigned to jobs
- ✅ **Realistic data**: Names, skills, experience generated from realistic data sets
- ✅ **Duplicate prevention**: Won't create duplicate users or applications
- ✅ **Progress tracking**: Shows detailed progress during execution
- ✅ **Configurable**: Customize user count and job count via CLI args

## Troubleshooting

### Server not running error

```bash
# Make sure dev server is running first
npm run dev
# Then run seed script in another terminal
```

### No active jobs found

```bash
# Make sure jobs are seeded first
# Access your app and navigate to sync or seed jobs
```

### Storage or authentication errors

- Check `NEXTAUTH_SECRET` in `.env`
- Check `AZURE_STORAGE_CONNECTION_STRING` in `.env`
- Ensure MongoDB is running

## Technical Details

- Uses JWT for API authentication
- Calls `/api/profile/resume/upload` for resume uploads
- Calls `/api/profile/extract` to trigger extraction + vectorization
- Calls `/api/applications/submit` to trigger scoring
- 100 first names × 100 last names = 10,000 unique combinations
- 50+ technical skills to choose from
- Realistic work experience scaled to years

## For More Information

See `scripts/README_SEED_TEST_DATA.md` for comprehensive documentation.
