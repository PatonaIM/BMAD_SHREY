import { describe, it, expect } from 'vitest';
import {
  applyInterviewRTCEvent,
  RealtimeSessionState,
  InterviewRTCEvent,
} from '../services/interview/realtimeInterview';

function base(): RealtimeSessionState {
  return {
    phase: 'connected',
    interviewPhase: 'pre_start',
  };
}

function evt(
  type: InterviewRTCEvent['type'],
  payload: Record<string, unknown> = {}
): InterviewRTCEvent {
  return { type, ts: Date.now(), payload };
}

describe('Interview journey state transitions', () => {
  it('transitions to intro on greet', () => {
    const prev = base();
    const partial = applyInterviewRTCEvent(prev, evt('interview.greet'));
    expect(partial.interviewPhase).toBe('intro');
  });

  it('moves to conducting on first question.ready after intro', () => {
    const prev: RealtimeSessionState = { ...base(), interviewPhase: 'intro' };
    const partial = applyInterviewRTCEvent(
      prev,
      evt('question.ready', { idx: 0 })
    );
    expect(partial.interviewPhase).toBe('conducting');
    expect(partial.currentQuestionIndex).toBe(0);
  });

  it('does not revert phase on subsequent question.ready', () => {
    const prev: RealtimeSessionState = {
      ...base(),
      interviewPhase: 'conducting',
      currentQuestionIndex: 0,
    };
    const partial = applyInterviewRTCEvent(
      prev,
      evt('question.ready', { idx: 1 })
    );
    expect(partial.interviewPhase).toBeUndefined(); // no change
    expect(partial.currentQuestionIndex).toBe(1);
  });

  it('completes interview and sets score on interview.score event', () => {
    const prev: RealtimeSessionState = { ...base(), interviewPhase: 'scoring' };
    const partial = applyInterviewRTCEvent(
      prev,
      evt('interview.score', { score: 87 })
    );
    expect(partial.interviewPhase).toBe('completed');
    expect(partial.finalScore).toBe(87);
  });

  it('completes interview without score on interview.done', () => {
    const prev: RealtimeSessionState = { ...base(), interviewPhase: 'scoring' };
    const partial = applyInterviewRTCEvent(prev, evt('interview.done'));
    expect(partial.interviewPhase).toBe('completed');
    expect(partial.finalScore).toBeUndefined();
  });

  it('sets aiSpeaking state on ai.state', () => {
    const prev = base();
    const partial = applyInterviewRTCEvent(
      prev,
      evt('ai.state', { speaking: true })
    );
    expect(partial.aiSpeaking).toBe(true);
  });
});
