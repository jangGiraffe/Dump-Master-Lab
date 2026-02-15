
import React, { useEffect } from 'react';
import { Keyboard, MousePointer2, Play, AlertCircle, Copy, Languages } from 'lucide-react';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded-md text-xs font-mono text-gray-700 shadow-[0_2px_0_rgba(0,0,0,0.1)] min-w-[24px] text-center inline-block">
      {children}
    </kbd>
  );
}

// Helper component for the separator
const Or = () => <span className="text-[10px] text-gray-400 mx-1 font-normal">또는</span>;

interface QuizTutorialProps {
  onStart: () => void;
}

export const QuizTutorial: React.FC<QuizTutorialProps> = ({ onStart }) => {
  // Listen for Space key to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fadeIn">
        <div className="bg-primary p-6 text-white text-center">
          <Keyboard className="w-12 h-12 mx-auto mb-3 opacity-90" />
          <h2 className="text-2xl font-bold">시험 조작 가이드</h2>
          <p className="text-blue-100 mt-2">키보드를 사용하여 더 빠르고 효율적으로 문제를 풀어보세요.</p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Navigation Controls */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center border-b pb-2">
                <MousePointer2 className="w-4 h-4 mr-2 text-primary" />
                문제 이동
              </h3>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">이전 문제</span>
                <div className="flex items-center">
                  <Kbd>A</Kbd>
                  <Or />
                  <Kbd>←</Kbd>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">다음 문제</span>
                <div className="flex items-center flex-wrap justify-end">
                  <Kbd>D</Kbd>
                  <Or />
                  <Kbd>→</Kbd>
                  <Or />
                  <Kbd>Space</Kbd>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">휠 / 터치 스와이프 이동</span>
                <span className="text-gray-400 text-[10px]">위 / 아래</span>
              </div>
            </div>

            {/* Answer Selection & Actions */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center border-b pb-2">
                <AlertCircle className="w-4 h-4 mr-2 text-primary" />
                답안 및 기능
              </h3>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">보기 선택 (1~6)</span>
                <div className="flex gap-1">
                  <Kbd>1</Kbd>
                  <Kbd>2</Kbd>
                  <Kbd>3</Kbd>
                  <Kbd>4</Kbd>
                  <Kbd>5</Kbd>
                  <Kbd>6</Kbd>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">해설 토글</span>
                <div className="flex items-center">
                  <Kbd>S</Kbd>
                  <Or />
                  <Kbd>↓</Kbd>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 flex items-center">
                  <Copy className="w-3 h-3 mr-1" />
                  AI 질문 복사
                </span>
                <div className="flex items-center">
                  <Kbd>V</Kbd>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 flex items-center">
                  <Languages className="w-3 h-3 mr-1" />
                  원문 보기
                </span>
                <div className="flex items-center">
                  <Kbd>O</Kbd>
                  <Or />
                  <Kbd>0</Kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
            <p className="flex items-start">
              <span className="mr-2">💡</span>
              <span>마지막 문제에서 <b>다음(D, Space)</b> 키를 누르면 시험이 제출됩니다. (마우스 휠/터치 스와이프 이동으로는 제출되지 않습니다.)</span>
            </p>
          </div>

          <button
            onClick={onStart}
            className="w-full mt-8 bg-primary hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center transform active:scale-[0.98]"
          >
            <Play className="w-5 h-5 mr-2" />
            시험 시작하기 (Space)
          </button>
        </div>
      </div>
    </div>
  );
};
