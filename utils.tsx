import React from 'react';
import { Question } from './types';
import { APP_CONFIG } from './config';
import resultSpriteUrl from './img/result16.png';

// 점수(0~100)에 따른 16단계 이미지 인덱스 (0=최고, 15=최저)
// Row 0: 100, 99-95, 94-90, 89-85
// Row 1: 84-80, 79-77, 76-74, 73-72
// Row 2: 71-68, 67-60, 59-50, 49-40
// Row 3: 39-30, 29-20, 19-10, 9-0
export const getResultImageIndex = (score: number): number => {
  if (score === 100) return 0;
  if (score >= 95) return 1;
  if (score >= 90) return 2;
  if (score >= 85) return 3;
  if (score >= 80) return 4;
  if (score >= 77) return 5;
  if (score >= 74) return 6;
  if (score >= 72) return 7;
  if (score >= 68) return 8;
  if (score >= 60) return 9;
  if (score >= 50) return 10;
  if (score >= 40) return 11;
  if (score >= 30) return 12;
  if (score >= 20) return 13;
  if (score >= 10) return 14;
  return 15;
};

const RESULT_MESSAGES = [
  '완벽한 점수! 놀라워요!',
  '만점! 당신은 천재!',
  '최고 기록! 멋진데!',
  '합격! 잘했어!',
  '잘했어! 계속해봐!',
  '훌륭해! 아주 좋았어!',
  '통과! 다음 단계로!',
  '나쁘지 않아! 좀 더 노력해!',
  '합격! 괜찮았어!',
  '잘했어! 실력 좋은데!',
  '좀 더 공부해야겠어.',
  '아쉽다! 다시 해봐.',
  '거의 다 왔어! 힘내!',
  '노력이 더 필요해.',
  '다시 도전! 포기하지 마!',
  '에픽 실패! 으악!',
];

// score: 0~100 점수, size: 이미지 크기(px)
export const ResultCharacter: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
  const idx = getResultImageIndex(score);
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  const message = RESULT_MESSAGES[idx];

  // 퍼센트 기반으로 정확한 타일 추출 (이미지가 4의 배수가 아니어도 정확)
  // background-size: 400% = 원본의 4배로 확대 → 한 칸이 컨테이너 크기와 동일
  // background-position: 0%/33.333%/66.666%/100% 로 3칸 간격 배치
  const posX = col === 0 ? '0%' : col === 1 ? '33.3333%' : col === 2 ? '66.6667%' : '100%';
  const posY = row === 0 ? '0%' : row === 1 ? '33.3333%' : row === 2 ? '66.6667%' : '100%';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundImage: `url(${resultSpriteUrl})`,
          backgroundSize: '400% 400%',
          backgroundPosition: `${posX} ${posY}`,
          backgroundRepeat: 'no-repeat',
          borderRadius: '12px',
          imageRendering: 'auto',
        }}
        title={message}
      />
      <p style={{
        fontSize: size >= 100 ? '14px' : '11px',
        fontWeight: 600,
        color: '#4B5563',
        textAlign: 'center',
        margin: 0,
        lineHeight: 1.3,
        whiteSpace: 'pre-line',
      }}>
        {message}
      </p>
    </div>
  );
};

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
