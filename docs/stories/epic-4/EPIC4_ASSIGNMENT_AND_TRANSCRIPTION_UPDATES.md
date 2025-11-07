# Epic 4 - Assignment & Transcription Updates

**Date:** November 7, 2025  
**Updated By:** PM Agent (John)  
**Status:** ✅ Complete

---

## Summary

Updated Epic 4 stories to optimize assignment workflow (recruiters use PDF/links only, candidates upload files) and added Gemini AI transcription for automatic interview feedback generation.

---

## Changes Made

### 1. **EP4-S13: Application Timeline - Recruiter Perspective**

#### **AC8: Assignment Management** (Updated)

**BEFORE:**

- Recruiters could upload assignment materials (PDF, Zip, etc.)
- File management burden on recruiters

**AFTER:**

- **PDF link only** (Google Drive, Dropbox)
- **External platform link** (HackerRank, CodeSignal, GitHub)
- **No file upload capability** for recruiters
- Simplified workflow, encourages professional platforms

**Rationale:**

- Reduces recruiter workload (no file management)
- Encourages standardized platforms (better candidate experience)
- Assignments typically hosted externally anyway

---

#### **AC7: Interview Scheduling** (Enhanced with Gemini AI)

**NEW FEATURE ADDED:**

**Gemini AI Transcription Pipeline:**

1. **Auto-trigger:** After "Interview Completed" event
2. **Transcription:** GMeet recording → Gemini 1.5 Pro API
3. **Analysis:** AI generates structured feedback:
   - Technical skills assessment
   - Communication quality
   - Culture fit indicators
   - Overall recommendation (Strong Yes → Strong No)
4. **Timeline Event:** "AI Feedback Generated" auto-created
5. **Recruiter Review:** Edit AI-generated draft before finalizing

**Interview Completed Event Now Includes:**

- Full transcript with speaker labels (Recruiter, Candidate)
- AI-generated feedback summary (editable)
- Structured feedback sections (pre-filled, customizable):
  - Technical Skills
  - Communication & Clarity
  - Culture Fit
  - Problem-Solving Approach
- Rating selector (pre-selected by AI, editable)
- Private notes textarea
- "Regenerate AI Summary" option
- "Approve & Save Feedback" finalizes

**Benefits:**

- Saves 10-15 minutes per interview (no manual note-taking)
- Consistent feedback structure
- Searchable transcripts for verification
- Reduced bias (AI baseline + human oversight)

---

### 2. **EP4-S12: Application Timeline - Candidate Perspective**

#### **AC7: Assignment Submission** (Enhanced)

**BEFORE:**

- Generic "Upload Submission" button
- Minimal detail on upload process

**AFTER:**

- **Full drag-and-drop upload modal**:
  - Multiple file support (.zip, .pdf, .js, .py, .java, .md, .docx)
  - 50MB total file size limit
  - File preview list before submission
  - Optional notes field (300 char max)
  - "Remove" option for individual files
- **After submission:**
  - Shows submitted files with download links
  - Displays candidate notes
  - "Resubmit" button (available until deadline)

**Rationale:**

- Candidates need file upload (unlike recruiters who provide links)
- Drag-and-drop for modern UX
- Multiple files support complex submissions (code + docs + diagrams)
- Notes field allows concise explanations

---

### 3. **UX Expert Response Document** (Updated)

#### **Added Wireframes:**

**A. Recruiter Assignment Modal (EP4-S13)**

- PDF link input field (Google Drive, Dropbox)
- External platform link field (HackerRank, CodeSignal)
- **Removed:** File upload section
- Auto-save drafts

**B. Gemini AI Feedback Interface (EP4-S13)**

- Transcript viewer modal (searchable, timestamped)
- AI-generated feedback card (editable sections)
- Yellow "DRAFT" banner for clarity
- Structured feedback categories
- Regenerate button
- Approve & Save button

**C. Candidate Assignment Upload Modal (EP4-S12)**

- Drag-and-drop zone with visual indicators
- Uploaded files list with remove buttons
- Notes textarea (optional context)
- File type and size restrictions shown
- Submit button

---

## Integration Requirements

### **Gemini API Integration**

**Endpoint:** Gemini 1.5 Pro API (audio transcription)

**Workflow:**

1. GMeet recording stored in cloud storage
2. Webhook triggers on interview completion
3. Backend sends audio to Gemini API
4. Gemini returns:
   - Full transcript (JSON with speaker labels, timestamps)
   - Structured analysis (technical, communication, culture fit)
   - Recommendation score
5. Backend creates timeline event: "AI Feedback Generated"
6. Frontend displays editable AI draft in recruiter timeline

**API Configuration:**

```typescript
interface GeminiTranscriptionRequest {
  audioUrl: string; // GMeet recording URL
  interviewType: string; // "phone_screen" | "technical" | "behavioral"
  jobTitle: string; // Context for AI analysis
  requiredSkills: string[]; // Key skills to assess
}

interface GeminiTranscriptionResponse {
  transcript: {
    text: string;
    speakers: Array<{
      speaker: 'recruiter' | 'candidate';
      timestamp: number;
      text: string;
    }>;
  };
  analysis: {
    technicalSkills: {
      rating: number; // 1-5
      summary: string;
      keyPoints: string[];
    };
    communication: {
      rating: number;
      summary: string;
    };
    cultureFit: {
      rating: number;
      summary: string;
    };
    overallRecommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
    overallRating: number; // 1-5
  };
}
```

**Cost Estimate:**

- Gemini 1.5 Pro: ~$0.02 per interview (45-60 min audio)
- Monthly (100 interviews): ~$2/month

---

## Files Modified

### **Story Files:**

1. `/docs/stories/epic-4/ep4-s13-application-timeline-recruiter.md`
   - **AC8:** Removed file upload, kept PDF/link only
   - **AC7:** Added Gemini transcription acceptance criteria

2. `/docs/stories/epic-4/ep4-s12-application-timeline-candidate.md`
   - **AC7:** Enhanced assignment submission with upload modal details

### **Design Files:**

1. `/docs/stories/epic-4/UX_EXPERT_RESPONSE.md`
   - **Section 5 (EP4-S13):** Updated assignment modal wireframe (PDF/link only)
   - **Section 6 (EP4-S13):** Added Gemini AI feedback wireframe with transcript viewer
   - **Section 6 (EP4-S12):** Added candidate assignment upload modal wireframe

---

## Implementation Impact

### **Backend Changes Required:**

1. **Gemini API Integration:**
   - New service: `GeminiTranscriptionService`
   - Webhook listener for GMeet recording completion
   - Timeline event creation: "AI Feedback Generated"
   - Draft feedback storage (editable by recruiter)

2. **Assignment Upload:**
   - Candidate file upload endpoint: `POST /api/candidate/assignments/:id/submit`
   - Multi-part form data support
   - Azure Blob Storage for file storage
   - File validation (type, size limits)

3. **Assignment Restrictions:**
   - Remove file upload from recruiter assignment endpoint
   - Validate PDF/link format
   - External platform link validation (optional)

### **Frontend Changes Required:**

1. **Recruiter Timeline (EP4-S13):**
   - Remove file upload from assignment modal
   - Add Gemini feedback viewer component
   - Transcript modal with search functionality
   - Editable AI feedback sections
   - Regenerate AI summary button

2. **Candidate Timeline (EP4-S12):**
   - Drag-and-drop upload component
   - File preview list
   - Upload progress indicator
   - Notes textarea
   - Resubmit functionality

### **API Endpoints:**

**New:**

- `POST /api/gemini/transcribe` - Trigger transcription
- `GET /api/interviews/:id/transcript` - Fetch transcript
- `POST /api/interviews/:id/feedback/regenerate` - Regenerate AI summary
- `POST /api/candidate/assignments/:id/submit` - Candidate file upload

**Updated:**

- `POST /api/recruiter/assignments/:id/create` - Remove file upload, keep PDF/link

---

## Testing Requirements

### **Gemini Transcription:**

- [ ] GMeet recording → Gemini API → transcript accuracy
- [ ] Speaker label accuracy (recruiter vs. candidate)
- [ ] AI feedback quality (technical, communication, culture fit)
- [ ] Edge cases: Poor audio quality, interruptions, multiple speakers
- [ ] Regenerate functionality
- [ ] Edit and save workflow

### **Assignment Upload (Candidate):**

- [ ] Drag-and-drop file upload
- [ ] Multiple file upload (3+ files)
- [ ] File size validation (reject >50MB)
- [ ] File type validation (accept only allowed types)
- [ ] Notes textarea (300 char limit)
- [ ] Resubmit before deadline
- [ ] Download submitted files

### **Assignment Creation (Recruiter):**

- [ ] PDF link validation (valid URL format)
- [ ] External platform link validation
- [ ] Cannot upload files (removed feature)
- [ ] Assignment deadline selection (1-7 days)
- [ ] Auto-save drafts

---

## Design Rationale Summary

### **Why PDF/Link Only for Recruiters?**

1. **Reduces workload:** No file management overhead
2. **Encourages best practices:** Professional platforms (HackerRank, CodeSignal)
3. **Simplifies workflow:** Share existing resources (Google Drive links)
4. **Modern standard:** Most companies use external platforms anyway

### **Why Gemini AI Transcription?**

1. **Time savings:** 10-15 min per interview (no manual notes)
2. **Consistency:** Structured feedback format across all interviews
3. **Reduces bias:** AI provides baseline, recruiter adjusts
4. **Verification:** Transcript available for audit/review
5. **Low cost:** ~$0.02 per interview

### **Why File Upload for Candidates?**

1. **Flexibility:** Not all assignments fit external platforms
2. **Portfolio submissions:** Multiple files (code, docs, diagrams)
3. **Candidate expectation:** Standard feature in job applications
4. **Accessibility:** Not all candidates have GitHub/external accounts

---

## Next Steps

1. **Phase 1: Backend Integration (Week 1-2)**
   - Gemini API service setup
   - GMeet webhook listener
   - File upload endpoint for candidates
   - Timeline event creation

2. **Phase 2: Frontend Components (Week 3-4)**
   - Gemini feedback viewer (recruiter)
   - Transcript modal with search
   - Candidate file upload modal
   - Assignment modal updates (recruiter)

3. **Phase 3: Testing & Refinement (Week 5)**
   - AI feedback quality testing
   - Upload flow testing
   - Edge case handling
   - Performance optimization

4. **Phase 4: Deployment (Week 6)**
   - Staged rollout (beta testers first)
   - Monitor Gemini API usage/cost
   - Collect recruiter feedback on AI accuracy
   - Iterate based on feedback

---

## Questions & Considerations

### **Open Questions:**

1. **GMeet Recording:** How to ensure all interviews are recorded? (Required setting in calendar invites)
2. **Gemini API Rate Limits:** What's the throughput? (Need to check API docs)
3. **Transcript Privacy:** Who can access transcripts? (Hiring team only, not candidate)
4. **AI Feedback Editing:** Should we track changes? (Yes, log edits for audit trail)

### **Future Enhancements:**

- **Sentiment analysis:** Detect candidate enthusiasm/hesitation from tone
- **Key moment detection:** AI flags important technical discussions
- **Multi-language support:** Transcribe non-English interviews
- **Candidate access:** Optional feature to share transcript with candidate

---

## Success Metrics

### **Gemini AI Transcription:**

- **Time saved:** 10-15 min per interview × 100 interviews/month = **25 hours/month saved**
- **Feedback consistency:** 90%+ recruiters use structured format
- **Accuracy:** 85%+ recruiter satisfaction with AI-generated summaries
- **Cost:** <$5/month for Gemini API usage

### **Assignment Workflow:**

- **Recruiter satisfaction:** 80%+ prefer PDF/link over file upload
- **Candidate completion rate:** No decrease from current baseline
- **Assignment turnaround:** Faster (easier for recruiters to create)

---

**Status:** All changes implemented in story files and UX documentation. Ready for engineering handoff.
