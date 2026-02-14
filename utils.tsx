import { Question } from './types';
import { APP_CONFIG } from './config';

// Password verification using config file
// Helper to hash password
const sha256 = async (message: string) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export const authenticateUser = async (input: string): Promise<'N' | 'V' | null> => {
  try {
    const inputHash = await sha256(input);
    if (inputHash === APP_CONFIG.NORMAL_PASSWORD_HASH) return 'N';
    if (inputHash === APP_CONFIG.VIP_PASSWORD_HASH) return 'V';
    return null;
  } catch (e) {
    console.error("Crypto error", e);
    return null;
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
