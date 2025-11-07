# Job Application System - Technical Architecture Brainstorming

**Session Date:** October 27, 2025
**Facilitator:** Business Analyst Mary
**Topic:** Technical Architecture & User Flows - Component-by-Component Deep Dive

## Component 1: Authentication System Architecture

### NextAuth.js Configuration Decisions

**Provider Configuration:**

- **Email/Password**: NextAuth Credentials provider with email verification, 8+ character password requirement
- **Google OAuth**: Basic profile scope (name, email, avatar)
- **GitHub OAuth**: Basic profile scope (name, email, avatar) - no repo access
- **Fallback Strategy**: Email/password login always available as backup

**Database Integration:**

- **Adapter**: Official `@next-auth/mongodb-adapter`
- **Collections**: Use NextAuth's standard collections (users, accounts, sessions)
- **Role-Based Access**: Custom role field in user object (candidate, recruiter, admin)

**Account Linking:**

- **Auto-link Strategy**: Automatic linking based on email address matching
- **Profile Enhancement**: Basic profile data from OAuth providers only
- **Data Enrichment**: Immediate profile creation with available OAuth data

### Authentication Flow Design

**Public Access:**

- **Job Browsing**: Anonymous users can view all job listings without login
- **Registration Trigger**: Login required only for job applications, profile creation
- **Email Verification**: Not mandatory initially - can be added later
- **User Journey**: Browse → Find interesting job → Register/Login → Apply

**Role Assignment Strategy:**

- Default role: "candidate" for all new registrations
- Role can be updated later through profile settings
- Future consideration: Recruiter invitation/approval system

### Technical Implementation - POC Approach

**Route Protection:**

- Public: `/jobs`, `/jobs/[id]`, homepage, static pages
- Protected: `/apply/*`, `/dashboard`, `/profile`, `/interview/*`
- Use NextAuth middleware for simple route protection

**UX Flow:**

- Anonymous browsing → Click "Apply" → Login modal → Application form
- Post-login: Direct to application form with profile completion prompt if needed
- Default role: "candidate" for all new users

**NextAuth Config (Simplified):**

```javascript
// Basic setup with Google, GitHub, Credentials providers
// MongoDB adapter with standard collections
// JWT strategy with role in token
// Auto-linking by email
```

## Component 2: User Management & Profiles

### Profile Data Structure

**Resume Processing Strategy:**

- **File Upload**: PDF/DOC upload with AI text extraction
- **Data Extraction**: Auto-populate profile fields from resume content
- **Manual Override**: Users can edit all extracted data
- **Version Control**: Keep original file + extracted data + user edits

**Profile Fields (Auto-extracted + Editable):**

- Personal: Name, email, phone, location
- Professional: Summary, experience level, current role
- Skills: Extracted from resume, user can add/edit
- Experience: Work history timeline
- Education: Degrees, certifications
- No upfront job preferences - learn from application behavior

**Data Flow:**
Upload Resume → AI Extraction → Populate Profile → User Review/Edit → Save

### Technical Implementation - Simple POC

**File Storage:** Local storage (uploads folder)
**AI Extraction:** Single OpenAI prompt to extract all profile data
**Database:** MongoDB with embedded profile document
**Processing:** Synchronous upload → extract → display for editing

```javascript
// Simple Profile Schema
{
  userId: ObjectId,
  resumeFile: String, // local file path
  extractedText: String,
  profile: {
    name, email, phone, location,
    summary, skills: [], experience: [], education: []
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Component 3: Resume Processing & Vectorization

### AI Processing Pipeline

**Vectorization Strategy:**

- **Input**: Full resume text (complete context for semantic understanding)
- **Embedding Model**: OpenAI text-embedding-3-small/large
- **Storage**: MongoDB Atlas Vector Search
- **Use Case**: Semantic job matching, candidate similarity, skill gap analysis

**Skills Processing:**

- **Normalization**: React.js → React, Node → Node.js (standardized skill names)
- **Experience Weighting**: Years per skill, recency scoring, project complexity
- **Extraction**: Skills + experience timeline + context from projects

**Enhanced Profile Schema:**

```javascript
{
  userId: ObjectId,
  resumeFile: String,
  extractedText: String,
  resumeVector: [Array], // OpenAI embedding of full resume
  profile: {
    // Basic fields...
    skills: [{
      name: "React",
      yearsExperience: 3,
      lastUsed: "2025-01",
      complexity: "advanced", // junior/mid/senior/advanced
      projects: ["E-commerce platform", "Dashboard UI"]
    }],
    experience: [/* enhanced with skill mapping */]
  }
}
```

## Component 4: Job Matching & AI Scoring Engine

### Scoring Algorithm Design

**Multi-Component Scoring (0-100 scale):**

- **Semantic Match**: 40% - Vector similarity between resume and job description
- **Skills Match**: 35% - Required skills coverage + experience level + recency
- **Experience Level**: 15% - Years of experience vs job requirements
- **Additional Factors**: 10% - Location, industry, company size match

**Score Enhancement:**

- **AI Interview Boost**: +5 to +15 points based on interview performance
- **Skill Demonstrations**: Practical coding/technical challenges
- **Communication Skills**: Assessed during AI interview

**Output Format:**

```javascript
{
  totalScore: 78,
  breakdown: {
    semanticMatch: 85,
    skillsMatch: 72,
    experienceLevel: 80,
    additionalFactors: 65,
    interviewBoost: 8
  },
  feedback: {
    forCandidate: {
      strengths: ["Strong React experience", "Good project portfolio"],
      improvements: ["Need more backend experience", "Consider learning TypeScript"],
      interviewOpportunity: "Boost your score by 8-12 points with an AI interview"
    },
    forRecruiter: {
      summary: "Strong frontend candidate with solid React skills. Has 3 years experience vs 2+ required. Lacks some backend requirements but shows good learning ability based on project progression. Interview recommended to assess communication and problem-solving skills.",
      riskFactors: ["Limited backend experience", "No enterprise-scale project experience"],
      recommendations: ["Good fit for frontend-focused role", "Consider for junior-mid level position"]
    }
  }
}
```

## Component 5: Real-time AI Interview System

### Interview Architecture

**Interview Configuration:**

- **Duration**: 15-20 minutes role-specific interviews
- **Format**: Voice-to-voice conversation with D-ID AI avatar
- **Question Generation**: Pre-generated based on candidate resume + job description
- **Assessment Focus**: Technical knowledge + Communication skills
- **Recording**: Full interview audio/video stored for review

**Technical Stack:**

- **Voice**: OpenAI Realtime API for natural conversation
- **Avatar**: D-ID for realistic AI interviewer presentation
- **Recording**: Store complete interview session (audio + video)
- **Question Bank**: Pre-generated, role-specific question sets

**Interview Flow:**

```javascript
// Interview Session Schema
{
  sessionId: ObjectId,
  candidateId: ObjectId,
  jobId: ObjectId,
  questions: [
    {
      question: "Explain your experience with React hooks",
      expectedAnswer: "Technical explanation covering useState, useEffect...",
      category: "technical"
    }
  ],
  responses: [
    {
      questionId: ObjectId,
      audioResponse: "path/to/audio.mp3",
      transcript: "I've used React hooks extensively...",
      score: 8,
      feedback: "Good understanding, clear explanation"
    }
  ],
  finalScore: 85,
  recordingPath: "interviews/session_123.mp4",
  createdAt: Date
}
```

**Score Boost Calculation:**

- Technical Accuracy: 60% of interview score
- Communication Clarity: 40% of interview score
- Final boost: 5-15 points added to overall job match score

## Component 6: Application Management System

### Application Workflow

**Application States:**

- **Draft** - Started application, not yet submitted
- **Submitted** - Application submitted, awaiting review
- **AI Interview** - Optional AI interview available/completed
- **Interview/Assessment** - Human interviews or technical assessments (multiple rounds possible)
- **Offer** - Job offer extended
- **Disqualified** - Application rejected at any stage

**Multi-Application Support:**

- Candidates can apply to unlimited jobs simultaneously
- Each application tracked independently
- Portfolio view showing all applications in dashboard

**Status Management:**

- **Recruiters**: Can change any application status
- **System**: Auto-updates after AI interview completion
- **Timeline**: Full history of status changes with timestamps

**Application Schema:**

```javascript
{
  applicationId: ObjectId,
  candidateId: ObjectId,
  jobId: ObjectId,
  status: "submitted", // current status
  scores: {
    initialMatch: 78,
    aiInterviewBoost: 12,
    totalScore: 90
  },
  timeline: [
    {
      status: "submitted",
      timestamp: Date,
      changedBy: "system",
      notes: "Application submitted"
    },
    {
      status: "ai_interview",
      timestamp: Date,
      changedBy: "candidate",
      notes: "AI interview completed, score boosted by 12 points"
    }
  ],
  interviews: [
    {
      type: "ai_interview",
      sessionId: ObjectId,
      completed: true,
      scoreBoost: 12
    },
    {
      type: "hiring_manager",
      scheduledDate: Date,
      completed: false,
      interviewerNotes: ""
    }
  ],
  recruiterNotes: "",
  submittedAt: Date,
  updatedAt: Date
}
```

## Component 7: Dashboard & Status Tracking

### User Dashboard Design - Tracking Focused

**Dashboard Layout:**

- **Application Overview**: Stats cards (total applications, in progress, offers, rejections)
- **Recent Activity**: Timeline of latest status changes across all applications
- **Action Items**: Pending AI interviews and upcoming scheduled interviews
- **Applications List**: Card-based layout showing all applications with status

**Application Card Display:**

```javascript
// Each application shows:
{
  jobTitle: "Senior Frontend Developer",
  company: "TechCorp",
  appliedDate: "Oct 15, 2025",
  currentStatus: "ai_interview",
  matchScore: 78,
  aiInterviewBoost: "+12",
  nextAction: "Schedule with hiring manager",
  statusProgress: "3/5 stages complete"
}
```

**Status Visualization:**

- Progress stepper component (Material-UI Stepper)
- Status badges with color coding
- Timeline view for detailed history
- Interactive "Start AI Interview" buttons where applicable

**No Job Recommendations**: Pure tracking focus - suggestions feature for future release

## Component 8: Admin Dashboard & System Overview

### Architecture Summary

**Minimal Admin Interface for POC:**

- Basic job posting interface
- Application review dashboard
- Status update controls
- Simple analytics (application counts, completion rates)

## Complete System Architecture

### Technology Stack

- **Frontend**: Next.js with Material-UI design system
- **Backend**: Node.js/Next.js API routes
- **Database**: MongoDB with vector search capability
- **Authentication**: NextAuth.js with Google, GitHub, email/password
- **AI**: OpenAI API for text extraction, embeddings, and interviews
- **Voice**: OpenAI Realtime API + D-ID for interview avatars
- **File Storage**: Local storage (uploads folder) for POC

### Data Flow Architecture

```
User Registration → Profile Creation → Resume Upload → AI Extraction →
Vectorization → Job Browsing → Application → AI Interview (Optional) →
Score Calculation → Status Tracking → Dashboard Updates
```

### Key MongoDB Collections

```javascript
// Users (NextAuth managed)
users: { _id, name, email, role, ... }

// Profiles
profiles: {
  userId, resumeFile, extractedText, resumeVector,
  profile: { skills, experience, education }
}

// Jobs
jobs: {
  _id, title, description, requirements,
  company, jobVector, status
}

// Applications
applications: {
  candidateId, jobId, status, scores, timeline,
  interviews: [], recruiterNotes
}

// Interview Sessions
interviews: {
  sessionId, candidateId, jobId, questions,
  responses: [], finalScore, recordingPath
}
```

### API Architecture

```
/api/auth/* - NextAuth endpoints
/api/profile/* - Profile management
/api/jobs/* - Job listings and applications
/api/interview/* - AI interview system
/api/applications/* - Application management
/api/admin/* - Admin dashboard endpoints
```

## Implementation Priority

### Phase 1 (MVP)

1. Authentication system with NextAuth
2. Basic profile creation and resume upload
3. Simple job browsing (anonymous + authenticated)
4. Application submission and tracking
5. Basic dashboard

### Phase 2 (AI Features)

1. Resume text extraction with OpenAI
2. Vector embeddings and job matching
3. AI scoring system
4. AI interview system with D-ID

### Phase 3 (Enhanced Features)

1. Advanced admin dashboard
2. Email notifications
3. Interview recording playback
4. Analytics and reporting

---

**Session Complete!** 🎉

**Total Components Designed:** 8
**Key Decisions Made:** 25+
**Architecture Approach:** Component-by-component with POC simplicity
**Next Steps:** Begin Phase 1 implementation with authentication and basic profile system
