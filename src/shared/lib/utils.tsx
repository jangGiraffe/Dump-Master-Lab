import React from 'react';
import { Question } from '@/shared/model/types';
import { APP_CONFIG } from '@/shared/config';
import resultSpriteUrl from '@/shared/assets/result16_new.png';

// 점수(0~100)에 따른 16단계 이미지 인덱스 (0=최고, 15=최저)
// Row 0: 100, 99-95, 94-90, 89-84
// Row 1: 83-78, 77-72, 71-64, 63-56
// Row 2: 55-48, 47-40, 39-32, 31-24
// Row 3: 23-16, 15-8, 7-1, 0
export const getResultImageIndex = (score: number): number => {
  if (score === 100) return 0;
  if (score >= 95) return 1;
  if (score >= 90) return 2;
  if (score >= 84) return 3;
  if (score >= 78) return 4;
  if (score >= 72) return 5; // 72점 이상 턱걸이 합격
  if (score >= 64) return 6;
  if (score >= 56) return 7;
  if (score >= 48) return 8;
  if (score >= 40) return 9;
  if (score >= 32) return 10;
  if (score >= 24) return 11;
  if (score >= 16) return 12;
  if (score >= 8) return 13;
  if (score >= 1) return 14;
  return 15;
};

const RESULT_MESSAGES = [
  '만점! 당신은 천재!',     // 0
  '완벽한 점수! 놀라워요!',      // 1
  '합격! 정말 잘하셨어요!',      // 2
  '최고 기록! 멋진데!',    // 3
  '합격! 계속 정진하세요!',    // 4
  '통과! 턱걸이 합격입니다!',    // 5
  '아쉬워요! 조금만 더 하면 합격!', // 6
  '나쁘지 않아요! 다시 도전!',   // 7
  '조금 더 노력이 필요해요.',    // 8
  '힘내세요! 다시 도전해볼까요?',  // 9
  '좀 더 공부해야겠어.',      // 10
  '아쉽다! 다시 해봐.',      // 11
  '거의 다 왔어! 힘내!',      // 12
  '노력이 더 필요해.',       // 13
  '다시 도전! 포기하지 마!',    // 14
  '에픽 실패! 으악!',       // 15
];

// score: 0~100 점수, size: 이미지 크기(px)
export const ResultCharacter: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
  const idx = getResultImageIndex(score);
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  const message = RESULT_MESSAGES[idx];

  // 이미지 태그와 overflow hidden을 사용하는 방식으로 변경하여 렌더링 안정성 확보
  // background-image 방식에서 발생하는 미세한 떨림(dancing) 현상 제거
  // 컨테이너 너비를 size로 고정하여 텍스트 길이에 따른 레이아웃 시프트 방지
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      width: `${size}px`
    }}>
      <div
        style={{
          width: '100%',
          height: `${size}px`,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '12px',
          flexShrink: 0, // Flex 컨테이너 내에서 크기 축소 방지
        }}
        title={message}
      >
        <img
          src={resultSpriteUrl}
          alt={message}
          style={{
            position: 'absolute',
            top: `-${row * 100}%`,
            left: `-${col * 100}%`,
            width: '400%',
            height: '400%',
            maxWidth: 'none',
            objectFit: 'fill',
            imageRendering: 'auto',
          }}
        />
      </div>
      <p style={{
        fontSize: size >= 100 ? '14px' : '11px',
        fontWeight: 600,
        color: '#4B5563',
        textAlign: 'center',
        margin: 0,
        lineHeight: 1.3,
        whiteSpace: 'pre-wrap', // 줄바꿈 허용
        wordBreak: 'keep-all',  // 단어 단위 줄바꿈
        width: '100%',          // 너비 제한
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
export const processRawQuestions = (rawData: any[], versionName: string, originalData?: any[]): Question[] => {
  return rawData.map((q, idx) => {
    let rawAnswer = q.answer || '';
    if (Array.isArray(rawAnswer)) {
      rawAnswer = rawAnswer.join('');
    }
    const normalizedAnswer = String(rawAnswer)
      .replace(/[\s,]+/g, '')
      .split('')
      .sort()
      .join('')
      .toUpperCase();

    const processedQ: Question = {
      ...q,
      answer: normalizedAnswer,
      // Keep real newlines and support literal \n strings if they exist
      question: q.question ? q.question.replace(/\\n/g, '\n') : '',
      explanation: q.explanation ? q.explanation.replace(/\\n/g, '\n') : '',
      sourceVersion: versionName,
      id: `${versionName}-${idx}`
    };

    // If original data is provided, link the matching question (by index)
    if (originalData && originalData[idx]) {
      const orig = originalData[idx];
      processedQ.originalQuestion = orig.question ? orig.question.replace(/\\n/g, '\n') : '';
      processedQ.originalOptions = orig.options || [];
      processedQ.originalExplanation = orig.explanation ? orig.explanation.replace(/\\n/g, '\n') : '';
    }

    return processedQ;
  });
};
