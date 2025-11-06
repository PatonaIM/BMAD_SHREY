import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '../../../../data-access/mongoClient';

export interface QuestionScoreData {
  sessionId: string;
  questionNumber: number;
  questionText: string;
  score: number; // 0-100
  feedback: string;
  timestamp: Date;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, questionText, score, feedback } = body;

    // Validate required fields
    if (!sessionId || score == null || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, score, feedback' },
        { status: 400 }
      );
    }

    // Clamp score to 0-100 range
    const clampedScore = Math.max(0, Math.min(100, Number(score)));

    const client = await getMongoClient();
    const db = client.db();
    const sessions = db.collection('interviewSessions');

    // Get current session to determine question number
    const session = await sessions.findOne({ sessionId });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Calculate question number based on existing scores
    const questionNumber = (session.questionScores?.length || 0) + 1;

    const scoreData: QuestionScoreData = {
      sessionId,
      questionNumber,
      questionText: questionText || `Question ${questionNumber}`,
      score: clampedScore,
      feedback,
      timestamp: new Date(),
    };

    // Append to questionScores array
    await sessions.updateOne(
      { sessionId },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $push: { questionScores: scoreData } as any,
        $set: { updatedAt: new Date() },
      }
    );

    // eslint-disable-next-line no-console
    console.log('[submit-question-score] Score submitted:', {
      sessionId,
      questionNumber,
      score: clampedScore,
    });

    return NextResponse.json({ success: true, scoreData });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[submit-question-score] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
