# Interview Refactoring Plan - Executive Summary

**Date:** 2025-11-04  
**Architect:** Winston  
**Epic:** 3 - AI Interview System Refactor

---

## Overview

This document outlines a comprehensive refactoring plan for the AI Interview system, transitioning from a monolithic 1730-line component to a clean, maintainable split-panel architecture with enhanced recording and coaching capabilities.

---

## Feasibility Assessment: ✅ HIGHLY FEASIBLE

### Why This Works

1. **Solid Foundation:** Existing WebRTC and audio processing infrastructure is robust
2. **Proven Technologies:** Canvas Capture API and Gemini 2.0 Live are well-supported
3. **Clear Separation:** Clean boundaries between interviewer (OpenAI) and coach (Gemini)
4. **Incremental Migration:** Can be done in phases without breaking existing functionality
5. **Risk Mitigation:** Feature flags and fallback mechanisms at every layer

### Key Technical Advantages

- **Reduced Complexity:** From one 1730-line component to multiple <500-line focused components
- **Parallel Development:** Multiple developers can work on different panels simultaneously
- **Better Testing:** Isolated components are easier to test and debug
- **Enhanced Context:** Canvas recording captures complete interview experience
- **Intelligent Coaching:** Gemini 2.0 provides LLM-based analysis vs. heuristics

---

## Problem Statement

### Current State Issues

**Monolithic Component:**

- 1730 lines of tightly coupled code
- Mixing UI, business logic, and data management
- Dual realtime pipelines with overlapping responsibilities
- Difficult to debug and extend

**Recording Limitations:**

- Only captures candidate camera feed
- Missing: questions displayed, coaching signals, screen shares
- Recruiters lack full context when reviewing

**Coaching Limitations:**

- Heuristic pattern matching (not intelligent)
- No question context awareness
- Can't provide targeted guidance

---

## Proposed Solution

### Architecture Vision

```
┌──────────────────────────────────────────────────┐
│           Interview Interface                     │
├────────────────────┬─────────────────────────────┤
│                    │                             │
│  AI Interview      │  Interview Helper           │
│  (ChatGPT 4o RT)   │  (Gemini 2.0 Live)         │
│                    │                             │
│  • Voice interview │  • Text coaching only       │
│  • Questions       │  • Question aware           │
│  • VAD detection   │  • Real-time analysis       │
│  • Audio playback  │  • Silent guidance          │
│                    │                             │
└────────────────────┴─────────────────────────────┘
                     │
                     ▼
          Canvas Recording Manager
          (Entire interface + webcam PiP)
                     │
                     ▼
                Azure Blob Storage
```

### Key Principles

1. **Single Responsibility:** Each component has one clear purpose
2. **Clean Separation:** OpenAI interview vs. Gemini coaching are independent
3. **Context Sharing:** Questions flow from interviewer to coach
4. **Graceful Degradation:** System works even if Gemini unavailable
5. **Enhanced Recording:** Capture complete context, not just camera

---

## Implementation Plan

### Four User Stories (21 Story Points Total)

#### EP3-S15: Extract Reusable Components (3 points) - **DO FIRST**

**Timeline:** Week 1 (5-6 days)  
**Dependencies:** None

Extract 7 components, 4 hooks, and 2 services from current monolithic file:

- AudioVisualizer, AISpeakingAnimation, InterviewStatus, InterviewControls
- CameraPermissionCheck, VideoPreview, RecordingIndicator
- Custom hooks for permissions, audio, timer, recording
- Service functions for question categorization

**Why First:**

- Enables parallel development
- No breaking changes (backward compatible)
- Tests components in isolation
- Avoids code duplication in new architecture

---

#### EP3-S12: Split-Panel Interface Refactor (8 points) - **CORE REFACTOR**

**Timeline:** Week 2-3 (10-12 days)  
**Dependencies:** EP3-S15

Transform monolithic component into clean architecture:

- **InterviewContainer:** Orchestrator (~300 lines)
- **AIInterviewPanel:** OpenAI Realtime interview (~400 lines)
- **InterviewHelperPanel:** Gemini coaching (~400 lines)

**Scope Reductions:**

- Remove live transcript UI (still capture for post-interview)
- Remove voice selector (default 'alloy')
- Simplify turn-taking to AI speaking animation only
- Move latency metrics to dev tools

**Benefits:**

- 75% reduction in average component size
- Clear component boundaries
- Easier debugging and testing
- Foundation for enhanced features

---

#### EP3-S13: Canvas Recording (5 points) - **PARALLEL TRACK 1**

**Timeline:** Week 4 (5-7 days)  
**Dependencies:** EP3-S12

Replace camera-only recording with full interface capture:

- Capture entire InterviewContainer using Canvas API
- Webcam as picture-in-picture overlay
- Mix candidate mic + AI audio
- Optional screen share mode for code demos

**What's Recorded:**

- Both AI Interview and Helper panels
- Questions displayed on screen
- Coaching signals in real-time
- Screen shares or code demonstrations
- Timer and status indicators
- Full audio (candidate + AI)

**Technical Approach:**

- `getDisplayMedia()` for component capture
- Canvas compositing for webcam overlay
- Web Audio API for audio mixing
- Graceful fallback to camera-only

---

#### EP3-S14: Gemini Text-Only Coach (5 points) - **PARALLEL TRACK 2**

**Timeline:** Week 4-5 (5-7 days)  
**Dependencies:** EP3-S12

Transform Gemini from heuristic to intelligent LLM-based coaching:

- **Text-Only Mode:** No audio output, pure analysis
- **Question Aware:** Receives context of what AI asked
- **Real-Time:** <700ms from speech end to coaching signal
- **Intelligent:** LLM understanding vs. pattern matching

**Coaching Signals:**

- Structure (STAR format)
- Clarity (be more specific)
- Relevance (stay on topic)
- Depth (elaborate details)
- Conciseness (summarize)
- Confidence (steady pace)
- Technical accuracy
- Positive reinforcement

**Benefits:**

- Context-aware coaching (knows the question)
- Better signal quality (LLM vs. regex)
- Non-blocking (interview continues if fails)
- Silent coach (no voice conflicts)

---

## Timeline & Resource Allocation

### Recommended Sequence

```
Week 1: Foundation
├─ EP3-S15: Extract Components (3 pts)
└─ Status: Ready for parallel work

Week 2-3: Core Refactor
├─ EP3-S12: Split-Panel Architecture (8 pts)
└─ Status: Enables enhanced features

Week 4-5: Enhanced Features (Parallel)
├─ EP3-S13: Canvas Recording (5 pts) ─┐
│                                      ├─ Can work in parallel
└─ EP3-S14: Gemini Coaching (5 pts) ─┘
```

### Total Timeline: 4-5 Weeks

- **Week 1:** Foundation work (no breaking changes)
- **Week 2-3:** Main refactor (monitored rollout)
- **Week 4-5:** Enhanced features (parallel tracks)

### Parallel Work Opportunities

After EP3-S12 is complete:

- One developer on Canvas recording
- Another on Gemini coaching
- Both are independent and can merge separately

---

## Risk Assessment & Mitigation

### High-Priority Risks

| Risk                                | Impact | Likelihood | Mitigation                                                                                               |
| ----------------------------------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------- |
| Refactor breaks existing interviews | HIGH   | Medium     | • Thorough testing<br>• Keep legacy component as fallback<br>• Feature flag for gradual rollout          |
| Canvas recording performance issues | MEDIUM | Medium     | • Adaptive quality settings<br>• Fallback to camera-only<br>• Performance profiling on low-end devices   |
| Gemini 2.0 API instability          | MEDIUM | Low        | • Feature flag to disable<br>• Graceful fallback to heuristics<br>• Interview continues without coaching |
| Audio-video sync drift              | MEDIUM | Medium     | • Use single MediaRecorder source<br>• Regular sync checks<br>• Jitter buffer and crossfade              |

### Mitigation Strategies

**Technical:**

- Feature flags for all new features
- Comprehensive test coverage (unit, integration, E2E)
- Performance benchmarks on various devices
- Gradual rollout with metrics monitoring

**Process:**

- Daily standup during refactor weeks
- Code review with at least 2 reviewers
- QA sign-off before production
- Rollback plan documented

---

## Success Metrics

### Code Quality Metrics

- **Component Size:** Average <500 lines (down from 1730)
- **Test Coverage:** >80% for critical paths
- **Technical Debt:** -60% (measured by complexity)

### Performance Metrics

- **Audio Latency:** <500ms (OpenAI Realtime)
- **Coaching Latency:** <700ms (Gemini analysis)
- **Recording FPS:** Stable 30fps
- **CPU Usage:** <30% during interview
- **Memory:** <500MB for 30-min session

### User Experience Metrics

- **Interview Completion Rate:** Maintain or improve from current
- **Recording Success Rate:** >98%
- **Coaching Signal Accuracy:** >85% relevant (qualitative review)
- **Developer Velocity:** 30% faster feature development post-refactor

---

## Scope Management

### Included in This Refactor

✅ Split-panel architecture  
✅ Component extraction and reusability  
✅ Canvas-based interface recording  
✅ Gemini 2.0 intelligent coaching  
✅ Question context sharing  
✅ Audio mixing (candidate + AI)  
✅ Screen share capability  
✅ Graceful degradation

### Explicitly Out of Scope

❌ Scoring algorithm changes (EP3-S5)  
❌ Recruiter dashboard features (EP3-S8)  
❌ Application score recalculation (EP3-S7)  
❌ Avatar lip-sync  
❌ Multi-language support  
❌ Resume interviews

### Future Enhancements (Post-Refactor)

- Real-time recording preview
- Multi-camera support
- Interview editing (trim, annotate)
- Live streaming to recruiter
- Interview highlights/bookmarks

---

## Decision Log

### Key Architectural Decisions

**1. Split vs. Tabbed Layout**

- **Decision:** Split-panel (desktop), stacked/tabbed (mobile)
- **Rationale:** Better visibility of both interview and coaching; responsive for mobile

**2. Canvas Recording vs. Camera-Only**

- **Decision:** Canvas recording (with camera fallback)
- **Rationale:** Complete context for recruiters; technical demonstrations; better review experience

**3. Gemini Text-Only vs. Voice**

- **Decision:** Text-only coaching
- **Rationale:** Avoids voice conflicts; clearer role separation; non-disruptive

**4. Remove Live Transcript**

- **Decision:** Remove from UI (still capture)
- **Rationale:** Reduces complexity; user focuses on speaking; available post-interview

**5. Remove Voice Selector**

- **Decision:** Remove UI, default to 'alloy'
- **Rationale:** Most users don't care; reduces setup friction; configurable later if needed

---

## Next Steps

### Immediate Actions (This Week)

1. **Review & Approve Plan**
   - Team review of this document
   - Architecture approval from tech lead
   - Product approval for scope reductions

2. **Resource Allocation**
   - Assign developers to EP3-S15 (foundation)
   - Schedule kickoff meeting
   - Set up project tracking (Jira/Linear)

3. **Environment Setup**
   - Create feature flags
   - Set up monitoring dashboards
   - Prepare test environments

### Before Starting Development

- [ ] Architecture plan approved
- [ ] Story points estimated and accepted
- [ ] Developers assigned
- [ ] Feature flags created
- [ ] Test strategy documented
- [ ] Rollback plan documented
- [ ] Success metrics baseline captured

---

## Conclusion

This refactoring addresses all stated concerns:

**✅ Reduces Complexity:** From 1730-line monolith to <500-line focused components  
**✅ Removes Unnecessary Features:** Live transcript, voice selector, excess indicators  
**✅ Enhances Recording:** Canvas capture with full interface context  
**✅ Improves Coaching:** Gemini 2.0 intelligent analysis with question awareness  
**✅ Clear Separation:** OpenAI interview vs. Gemini helper are independent  
**✅ Maintainable:** Clean boundaries enable faster feature development

**Feasibility:** HIGHLY FEASIBLE with proven technologies and incremental approach  
**Timeline:** 4-5 weeks with well-defined phases  
**Risk:** LOW-MEDIUM with comprehensive mitigation strategies

**Recommendation:** PROCEED with EP3-S15 immediately to establish foundation for parallel work.

---

## References

- **Detailed Stories:** See `docs/stories/ep3-s{12-15}-*.md`
- **Epic Index:** `docs/stories/epic-3-ai-interview-system.md`
- **Architecture:** `docs/architecture.md`
- **Current Code:** `src/components/interview/InterviewInterface.tsx` (1730 lines)

---

**Prepared By:** Winston (Architect)  
**Date:** 2025-11-04  
**Version:** 1.0  
**Status:** Ready for Review & Approval
