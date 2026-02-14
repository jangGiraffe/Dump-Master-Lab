import { Question } from './types';
import { APP_CONFIG } from './config';

// Password verification using config file
const TARGET_HASH = APP_CONFIG.PASSWORD_HASH;

export const verifyPassword = (input: string): boolean => {
  try {
    return btoa(input) === TARGET_HASH;
  } catch (e) {
    return false;
  }
};

export const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper to assign IDs and source to raw data
export const processRawQuestions = (rawData: any[], versionName: string): Question[] => {
  return rawData.map((q, idx) => ({
    ...q,
    // Replace newlines with spaces to improve readability
    question: q.question ? q.question.replace(/\n/g, ' ') : '',
    explanation: q.explanation ? q.explanation.replace(/\n/g, ' ') : '',
    sourceVersion: versionName,
    id: `${versionName}-${idx}-${Date.now()}`
  }));
};
