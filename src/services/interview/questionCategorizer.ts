/**
 * Question Categorizer Service
 * Categorizes interview questions based on content analysis
 */

export type QuestionCategory =
  | 'technical'
  | 'behavioral'
  | 'experience'
  | 'situational';

/**
 * Categorizes interview questions by analyzing their content
 * @param questionText - The interview question to categorize
 * @returns The category of the question
 */
export function categorizeQuestion(questionText: string): QuestionCategory {
  const lower = questionText.toLowerCase();

  // Technical indicators
  if (
    /\b(code|programming|algorithm|data structure|api|database|framework|technology|debug|implement|optimize)\b/i.test(
      lower
    )
  ) {
    return 'technical';
  }

  // Behavioral indicators
  if (
    /\b(tell me about a time|describe a situation|how do you handle|what would you do if|conflict|challenge|feedback)\b/i.test(
      lower
    )
  ) {
    return 'behavioral';
  }

  // Experience indicators
  if (
    /\b(experience with|worked on|project|role|responsibility|previous|past|background)\b/i.test(
      lower
    )
  ) {
    return 'experience';
  }

  // Default to situational
  return 'situational';
}
