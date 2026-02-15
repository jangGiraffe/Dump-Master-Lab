
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Question } from '../types';
import { formatTime } from '../utils';
import { Clock, HelpCircle, ChevronLeft, ChevronRight, AlertTriangle, Copy, Languages } from 'lucide-react';
import { QuizTutorial } from './QuizTutorial';

interface QuizProps {
  questions: Question[];
  timeLimitMinutes: number;
  onComplete: (userAnswers: Record<string, string>, timeLeft: number) => void;
}

export const Quiz: React.FC<QuizProps> = ({ questions, timeLimitMinutes, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(timeLimitMinutes * 60);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Use ref to track if quiz is finished to prevent multiple submissions
  const isFinishedRef = useRef(false);
  // Ref for explanation section to scroll into view
  const explanationRef = useRef<HTMLDivElement>(null);

  // Extract option letter (A, B, C, D)
  const getOptionLabel = useCallback((opt: string) => opt.split('.')[0].trim(), []);

  // Finish Handler
  const handleFinish = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    onComplete(answers, timeLeft);
  }, [answers, timeLeft, onComplete]);

  // Timer Effect - Separate from handleFinish to avoid stale closures
  useEffect(() => {
    if (showTutorial) return;
    if (isFinishedRef.current) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showTutorial]);

  // Watch for time running out
  useEffect(() => {
    if (timeLeft === 0 && !isFinishedRef.current && !showTutorial) {
      handleFinish();
    }
  }, [timeLeft, handleFinish, showTutorial]);

  // Auto-scroll to explanation when it opens
  useEffect(() => {
    if (showExplanation && explanationRef.current) {
      // Small timeout to ensure DOM is rendered before scrolling
      setTimeout(() => {
        explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showExplanation]);

  // Handle Copy Question for AI
  const handleCopyQuestion = useCallback(async () => {
    const currentQ = questions[currentIdx];

    // Determine full answer text
    let answerText = currentQ.answer;
    if (currentQ.options && currentQ.options.length > 0) {
      // Handle multiple answers (e.g. "AD") or single "A"
      const correctLabels = currentQ.answer.split('').map(s => s.trim());

      const foundOptions = currentQ.options.filter(opt => {
        const label = getOptionLabel(opt);
        return correctLabels.includes(label);
      });

      if (foundOptions.length > 0) {
        answerText = foundOptions.join(', ');
      }
    }

    const allOptionsText = currentQ.options.join('\n');
    const text = `${currentQ.question} 에 대한 답은 ${answerText} 이고,\n선택지는\n${allOptionsText}\n 이 있어 설명을 좀해줘.\n시험 대비 팁도 알려줘.`;

    try {
      await navigator.clipboard.writeText(text);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, [questions, currentIdx, getOptionLabel]);

  // Handle Answer Selection
  const handleSelectOption = useCallback((optionLabel: string) => {
    if (isFinishedRef.current) return;
    const currentQ = questions[currentIdx];
    const isMultiple = currentQ.answer.length > 1;

    setAnswers(prev => {
      const currentAnswer = prev[currentQ.id] || "";

      if (isMultiple) {
        // Toggle logic for multiple answers
        let newAnswerArr = currentAnswer.split('').filter(s => s.length > 0);
        if (newAnswerArr.includes(optionLabel)) {
          newAnswerArr = newAnswerArr.filter(s => s !== optionLabel);
        } else {
          newAnswerArr.push(optionLabel);
        }
        const newAnswer = newAnswerArr.sort().join('');

        return {
          ...prev,
          [currentQ.id]: newAnswer
        };
      } else {
        // Standard radio logic for single answer
        return {
          ...prev,
          [currentQ.id]: optionLabel
        };
      }
    });
  }, [questions, currentIdx]);

  // Navigation Handlers
  const handleNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setShowExplanation(false);
      setShowOriginal(false);
    } else {
      handleFinish();
    }
  }, [currentIdx, questions.length, handleFinish]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      setShowExplanation(false);
      setShowOriginal(false);
    }
  }, [currentIdx]);

  // Empty/Error Question Auto-Answer Logic
  useEffect(() => {
    const currentQ = questions[currentIdx];
    if (!currentQ.options || currentQ.options.length === 0) {
      if (answers[currentQ.id] !== currentQ.answer) {
        setAnswers(prev => ({
          ...prev,
          [currentQ.id]: currentQ.answer
        }));
      }
    }
  }, [currentIdx, questions, answers]);

  // Keyboard Shortcuts
  useEffect(() => {
    if (showTutorial) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const currentQ = questions[currentIdx];

      // Prevent default scrolling for Space/Arrows
      // Check e.code or uppercase key for arrows to match correctly
      if (['SPACE', 'ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT'].includes(key) || e.key === ' ') {
        e.preventDefault();
      }

      // Navigation
      if (key === 'D' || key === 'ARROWRIGHT' || e.key === ' ') {
        handleNext();
      } else if (key === 'A' || key === 'ARROWLEFT') {
        handlePrev();
      }

      // Explanation Toggle (Unified S or Down)
      else if (key === 'S' || key === 'ARROWDOWN') {
        setShowExplanation(prev => !prev);
      }

      // Copy Question (V)
      else if (key === 'V') {
        handleCopyQuestion();
      }

      // View Original (O or 0)
      else if ((key === 'O' || key === '0') && currentQ.originalQuestion) {
        setShowOriginal(prev => !prev);
      }

      // Answer Selection (1-6)
      else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const index = parseInt(e.key) - 1;
        if (currentQ.options && currentQ.options[index]) {
          const label = getOptionLabel(currentQ.options[index]);
          handleSelectOption(label);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTutorial, currentIdx, questions, handleNext, handlePrev, handleSelectOption, getOptionLabel, handleCopyQuestion]);

  const currentQ = questions[currentIdx];
  const selectedAnswer = answers[currentQ.id];
  const isErrorQuestion = !currentQ.options || currentQ.options.length === 0;

  // Render Component
  return (
    <div className="flex flex-col flex-grow bg-gray-50 min-h-0 overflow-hidden">
      {/* Tutorial Modal */}
      {showTutorial && <QuizTutorial onStart={() => setShowTutorial(false)} />}

      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center font-mono font-medium text-lg ${timeLeft < 300 ? 'text-danger animate-pulse' : 'text-gray-700'}`}>
            <Clock className="w-5 h-5 mr-2" />
            {formatTime(timeLeft)}
          </div>
          <div className="hidden sm:block text-sm text-gray-500">
            문제 {currentIdx + 1} / {questions.length}
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-4 hidden sm:block">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
          <button
            onClick={handleFinish}
            className="bg-success hover:bg-green-600 text-white text-sm font-semibold py-1.5 px-4 rounded transition-colors"
          >
            시험 제출
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow min-h-0 p-4 md:p-6 max-w-4xl mx-auto w-full outline-none overflow-y-auto" tabIndex={0}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">

          <div className="flex justify-between items-start mb-4">
            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-medium mb-2">
              출처: {currentQ.sourceVersion}
            </span>
          </div>

          <h2 className="text-lg md:text-xl font-medium text-gray-900 mb-6 leading-relaxed whitespace-pre-wrap">
            {showOriginal && currentQ.originalQuestion ? currentQ.originalQuestion : currentQ.question}
            {currentQ.answer.length > 1 && (
              <span className="ml-2 inline-block bg-blue-100 text-primary text-[10px] px-1.5 py-0.5 rounded align-middle font-bold border border-blue-200">
                복수 선택 ({currentQ.answer.length}개)
              </span>
            )}
          </h2>

          <hr className="border-t border-gray-200 my-6" />

          {isErrorQuestion ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-red-700">오류 문제</h3>
              <p className="text-red-600 mt-1">선택지 데이터가 없습니다. 자동으로 정답 처리됩니다.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {currentQ.options.map((opt, idx) => {
                const label = getOptionLabel(opt);
                const isSelected = selectedAnswer ? selectedAnswer.includes(label) : false;

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectOption(label)}
                    className={`
                      relative p-3 md:p-4 border rounded-lg cursor-pointer transition-all flex items-start group
                      ${isSelected ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                    `}
                  >
                    <div className="absolute right-3 top-3 hidden md:block opacity-0 group-hover:opacity-30 transition-opacity">
                      <span className="text-xs border border-gray-400 rounded px-1.5 py-0.5 text-gray-500 font-mono">
                        {idx + 1}
                      </span>
                    </div>

                    <div className={`
                      w-5 h-5 rounded-full border flex items-center justify-center mr-3 flex-shrink-0 mt-0.5
                      ${isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300 text-gray-500'}
                    `}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm md:text-base text-gray-700 leading-snug">
                      {(showOriginal && currentQ.originalOptions && currentQ.originalOptions[idx])
                        ? currentQ.originalOptions[idx]
                        : opt
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Explanation & Copy Actions */}
          <div className="border-t pt-4">
            <div className="flex items-center flex-wrap gap-y-3 gap-x-4 mb-4">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center text-primary font-medium hover:text-blue-700 transition-colors text-sm md:text-base group"
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                <span>{showExplanation ? "해설 숨기기" : "해설 보기"}</span>
                <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 font-mono inline-block group-hover:bg-gray-200">
                  S
                </span>
              </button>

              {currentQ.originalQuestion && (
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className={`flex items-center font-medium transition-colors text-sm md:text-base group ${showOriginal ? 'text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}
                >
                  <Languages className="w-5 h-5 mr-2" />
                  <span>{showOriginal ? "한국어 보기" : "원문 보기"}</span>
                  <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 font-mono inline-block group-hover:bg-gray-200">
                    O, 0
                  </span>
                </button>
              )}

              <button
                onClick={handleCopyQuestion}
                className="flex items-center text-gray-500 hover:text-gray-900 transition-colors text-sm md:text-base group"
                title="AI에게 질문하기 위해 문제와 답 복사"
              >
                <Copy className="w-4 h-4 mr-2" />
                <span>AI 질문 복사</span>
                <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 font-mono inline-block group-hover:bg-gray-200">
                  V
                </span>
              </button>
            </div>

            {showExplanation && (
              <div
                ref={explanationRef}
                className="p-4 bg-yellow-50 border border-warning/30 rounded-lg text-gray-800 animate-fadeIn text-sm scroll-mt-20"
              >
                <p className="font-semibold mb-1 text-warning/90">정답: {currentQ.answer}</p>
                <div className="whitespace-pre-wrap">{currentQ.explanation}</div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800/90 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center animate-fadeIn backdrop-blur-sm whitespace-nowrap">
          <Copy className="w-4 h-4 mr-2 text-green-400" />
          <span className="text-sm font-medium">질문과 답이 복사됐어요. AI에게 질문해보세요</span>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className="bg-white border-t p-4 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className={`flex items-center px-4 py-2 rounded font-medium text-sm group transition-colors ${currentIdx === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            <div className="flex flex-col items-start">
              <span>이전</span>
              {currentIdx !== 0 && <span className="text-[10px] text-gray-400 font-normal block font-mono">[A]</span>}
            </div>
          </button>

          <span className="text-sm font-medium text-gray-500 sm:hidden">
            {currentIdx + 1} / {questions.length}
          </span>

          <button
            onClick={handleNext}
            className={`flex items-center px-4 py-2 rounded font-medium text-sm group transition-colors ${currentIdx === questions.length - 1 ? 'text-primary hover:bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <div className="flex flex-col items-end">
              <span>{currentIdx === questions.length - 1 ? '제출' : '다음'}</span>
              <span className={`text-[10px] font-normal block font-mono ${currentIdx === questions.length - 1 ? 'text-blue-300' : 'text-gray-400'}`}>
                [D]
              </span>
            </div>
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      </footer>
    </div>
  );
};
