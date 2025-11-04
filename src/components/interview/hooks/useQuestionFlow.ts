/**
 * useQuestionFlow Hook
 * Manages question progression and context sharing between AI interview and helper
 */

import { useCallback, useState } from 'react';
import { categorizeQuestion } from '../../../services/interview/questionCategorizer';
import type {
  CurrentQuestion,
  QuestionCategory,
} from '../types/interview.types';

export interface UseQuestionFlowOptions {
  onQuestionAsked?: (_question: CurrentQuestion) => void;
  onQuestionContextShared?: (
    _questionText: string,
    _category: QuestionCategory
  ) => void;
}

export interface UseQuestionFlowReturn {
  currentQuestion: CurrentQuestion | null;
  questionsAsked: CurrentQuestion[];
  detectQuestion: (_text: string) => boolean;
  handleQuestionAsked: (_questionText: string) => void;
  resetQuestionFlow: () => void;
}

export function useQuestionFlow({
  onQuestionAsked,
  onQuestionContextShared,
}: UseQuestionFlowOptions = {}): UseQuestionFlowReturn {
  const [currentQuestion, setCurrentQuestion] =
    useState<CurrentQuestion | null>(null);
  const [questionsAsked, setQuestionsAsked] = useState<CurrentQuestion[]>([]);

  const detectQuestion = useCallback((text: string): boolean => {
    // Detect if text is a question
    const isQuestion =
      text.trim().endsWith('?') ||
      /\b(what|how|why|when|where|who|tell me|describe|explain|can you)\b/i.test(
        text
      );
    return isQuestion;
  }, []);

  const handleQuestionAsked = useCallback(
    (questionText: string) => {
      const category = categorizeQuestion(questionText);

      const question: CurrentQuestion = {
        id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: questionText,
        category,
        askedAt: new Date(),
      };

      setCurrentQuestion(question);
      setQuestionsAsked(prev => [...prev, question]);

      // Notify parent handlers
      onQuestionAsked?.(question);
      onQuestionContextShared?.(questionText, category);
    },
    [onQuestionAsked, onQuestionContextShared]
  );

  const resetQuestionFlow = useCallback(() => {
    setCurrentQuestion(null);
    setQuestionsAsked([]);
  }, []);

  return {
    currentQuestion,
    questionsAsked,
    detectQuestion,
    handleQuestionAsked,
    resetQuestionFlow,
  };
}
