import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { Question } from '@/shared/model/types';
import { formatTime } from '@/shared/lib/utils';
import { Clock, HelpCircle, ChevronLeft, ChevronRight, AlertTriangle, Copy, Languages, ChevronUp, ChevronDown } from 'lucide-react';
import { QuizTutorial } from './ui/QuizTutorial';

interface QuizProps {
  questions: Question[];
  timeLimitMinutes: number;
  onComplete: (userAnswers: Record<string, string>, timeLeft: number) => void;
  wrongCountMap?: Record<string, number>;
}

export const Quiz: React.FC<QuizProps> = ({ questions, timeLimitMinutes, onComplete, wrongCountMap = {} }) => {
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
  const mainRef = useRef<HTMLElement>(null);
  const lastWheelTime = useRef(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [touchOffset, setTouchOffset] = useState(0);
  const [vTouchOffset, setVTouchOffset] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  // Extract option letter (A, B, C, D)
  const getOptionLabel = useCallback((opt: string) => opt.split('.')[0].trim(), []);

  // Strip option letter for display (e.g. "A. Choice" -> "Choice")
  const stripLabel = useCallback((opt: string) => {
    return opt.replace(/^[A-Z]\.\s*/, '');
  }, []);

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

      const foundOptions = currentQ.options
        .filter(opt => {
          const label = getOptionLabel(opt);
          return correctLabels.includes(label);
        })
        .map(opt => stripLabel(opt));

      if (foundOptions.length > 0) {
        answerText = foundOptions.join(', ');
      }
    }

    const allOptionsText = currentQ.options.map(opt => stripLabel(opt)).join('\n');
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
      setAnimationKey(prev => prev + 1);
      // Reset scroll position
      if (mainRef.current) mainRef.current.scrollTop = 0;
    } else {
      handleFinish();
    }
  }, [currentIdx, questions.length, handleFinish]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      setShowExplanation(false);
      setShowOriginal(false);
      setAnimationKey(prev => prev + 1);
      // Reset scroll position
      if (mainRef.current) mainRef.current.scrollTop = 0;
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

  // Wheel Scroll Navigation
  useEffect(() => {
    if (showTutorial) return;

    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastWheelTime.current < 600) return; // Throttle to prevent rapid skipping

      const container = mainRef.current;
      if (!container) return;

      const isAtTop = container.scrollTop <= 0;
      const isAtBottom = Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 2;

      if (e.deltaY > 30) { // Scroll Down
        if (isAtBottom && currentIdx < questions.length - 1) {
          handleNext();
          lastWheelTime.current = now;
        }
      } else if (e.deltaY < -30) { // Scroll Up
        if (isAtTop && currentIdx > 0) {
          handlePrev();
          lastWheelTime.current = now;
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [showTutorial, currentIdx, questions.length, handleNext, handlePrev]);

  // Touch Swipe Navigation (Horizontal)
  useEffect(() => {
    if (showTutorial) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      setTouchOffset(0);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartXRef.current === null || touchStartYRef.current === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = touchStartXRef.current - currentX;
      const diffY = touchStartYRef.current - currentY;

      const container = mainRef.current;
      if (!container) return;
      const isAtTop = container.scrollTop <= 0;
      const isAtBottom = Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 2;

      // Vertical feedback at boundaries
      if (Math.abs(diffY) > Math.abs(diffX)) {
        if (isAtTop && diffY < 0) { // Pulling down at top
          setVTouchOffset(-diffY * 0.5);
        } else if (isAtBottom && diffY > 0) { // Pulling up at bottom
          setVTouchOffset(-diffY * 0.5);
        } else {
          setVTouchOffset(0);
        }
      }

      // If horizontal movement is dominant, update offset for visual feedback
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Apply resistance effect (logarithmic-like scaling)
        const resistance = 0.8;
        setTouchOffset(-diffX * resistance);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartXRef.current === null || touchStartYRef.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchStartXRef.current - touchEndX;
      const diffY = touchStartYRef.current - touchEndY;
      const threshold = 100; // Threshold for intentional swipe

      const container = mainRef.current;
      if (!container) return;
      const isAtTop = container.scrollTop <= 0;
      const isAtBottom = Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 2;

      // Handle horizontal swipes
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
        if (diffX > 0) { // Swiped Left -> Next
          if (currentIdx < questions.length - 1) {
            handleNext();
          }
        } else { // Swiped Right -> Prev
          if (currentIdx > 0) {
            handlePrev();
          }
        }
      }
      // Handle vertical swipes at boundaries
      else if (Math.abs(diffY) > threshold) {
        if (diffY > 0 && isAtBottom) { // Pulled up at bottom
          if (currentIdx < questions.length - 1) {
            handleNext();
          }
        } else if (diffY < 0 && isAtTop) { // Pulled down at top
          if (currentIdx > 0) {
            handlePrev();
          }
        }
      }

      touchStartXRef.current = null;
      touchStartYRef.current = null;
      setTouchOffset(0);
      setVTouchOffset(0);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showTutorial, currentIdx, questions.length, handleNext, handlePrev]);

  const currentQ = questions[currentIdx];
  const selectedAnswer = answers[currentQ.id];
  const isErrorQuestion = !currentQ.options || currentQ.options.length === 0;

  // Render Component
  return (
    <div className="flex flex-col flex-grow bg-gray-50 dark:bg-slate-900 min-h-0 overflow-hidden transition-colors duration-300">
      {/* Tutorial Modal */}
      {showTutorial && <QuizTutorial onStart={() => setShowTutorial(false)} />}

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 sticky top-0 z-10 shadow-sm flex justify-between items-center shrink-0 transition-colors duration-300">

        {/* Swipe Feedback Overlay - Left (Previous) */}
        {touchOffset > 10 && currentIdx > 0 && (
          <div
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center justify-start pl-4 h-32 w-24 rounded-r-full bg-gradient-to-r from-primary/20 to-transparent transition-opacity"
            style={{ opacity: Math.min(touchOffset / 100, 0.8) }}
          >
            <ChevronLeft
              className="text-primary w-12 h-12 transition-transform"
              style={{ transform: `translateX(${Math.min(touchOffset / 3, 20)}px) scale(${0.8 + Math.min(touchOffset / 200, 0.5)})` }}
            />
          </div>
        )}

        {/* Swipe Feedback Overlay - Right (Next) */}
        {touchOffset < -10 && currentIdx < questions.length - 1 && (
          <div
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center justify-end pr-4 h-32 w-24 rounded-l-full bg-gradient-to-l from-primary/20 to-transparent transition-opacity"
            style={{ opacity: Math.min(Math.abs(touchOffset) / 100, 0.8) }}
          >
            <ChevronRight
              className="text-primary w-12 h-12 transition-transform"
              style={{ transform: `translateX(${-Math.min(Math.abs(touchOffset) / 3, 20)}px) scale(${0.8 + Math.min(Math.abs(touchOffset) / 200, 0.5)})` }}
            />
          </div>
        )}

        {/* Scroll Feedback Overlay - Top (Previous) */}
        {vTouchOffset > 10 && currentIdx > 0 && (
          <div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center justify-start pt-4 w-48 h-24 rounded-b-full bg-gradient-to-b from-primary/20 to-transparent transition-opacity"
            style={{ opacity: Math.min(vTouchOffset / 100, 0.8) }}
          >
            <ChevronUp
              className="text-primary w-12 h-12 transition-transform"
              style={{ transform: `translateY(${Math.min(vTouchOffset / 3, 20)}px) scale(${0.8 + Math.min(vTouchOffset / 200, 0.5)})` }}
            />
            <span className="text-[10px] text-primary font-bold mt-1 uppercase tracking-widest">Previous</span>
          </div>
        )}

        {/* Scroll Feedback Overlay - Bottom (Next) */}
        {vTouchOffset < -10 && currentIdx < questions.length - 1 && (
          <div
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center justify-end pb-4 w-48 h-24 rounded-t-full bg-gradient-to-t from-primary/20 to-transparent transition-opacity"
            style={{ opacity: Math.min(Math.abs(vTouchOffset) / 100, 0.8) }}
          >
            <span className="text-[10px] text-primary font-bold mb-1 uppercase tracking-widest">Next</span>
            <ChevronDown
              className="text-primary w-12 h-12 transition-transform"
              style={{ transform: `translateY(${-Math.min(Math.abs(vTouchOffset) / 3, 20)}px) scale(${0.8 + Math.min(Math.abs(vTouchOffset) / 200, 0.5)})` }}
            />
          </div>
        )}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center font-mono font-medium text-lg ${timeLeft < 300 ? 'text-danger animate-pulse' : 'text-gray-700 dark:text-slate-200'}`}>
            <Clock className="w-5 h-5 mr-2" />
            {formatTime(timeLeft)}
          </div>
          <div className="hidden sm:block text-sm text-gray-500 dark:text-slate-400">
            문제 {currentIdx + 1} / {questions.length}
          </div>
        </div>

        <div className="flex items-center">
          <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 mr-4 hidden sm:block">
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
          <div className="ml-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        ref={mainRef}
        className="flex-grow min-h-0 px-4 py-8 md:p-8 max-w-4xl mx-auto w-full outline-none overflow-y-auto"
        tabIndex={0}
      >
        <div className="pb-16 md:pb-20"> {/* Margin to ensure content isn't covered by footer */}
          <div
            key={animationKey}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 md:p-10 animate-slideIn transition-colors duration-300"
          >

            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="inline-block bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Source: {currentQ.sourceVersion}
                </span>
                {wrongCountMap[currentQ.id] > 0 && (
                  <span className="inline-block bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    누적 {wrongCountMap[currentQ.id]}회 오답
                  </span>
                )}
              </div>
            </div>

            <h2 className="text-lg md:text-xl font-medium text-gray-900 dark:text-slate-100 mb-6 leading-relaxed whitespace-pre-wrap">
              {showOriginal && currentQ.originalQuestion ? currentQ.originalQuestion : currentQ.question}
              {currentQ.answer.length > 1 && (
                <span className="ml-2 inline-block bg-blue-100 dark:bg-blue-900/30 text-primary dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded align-middle font-bold border border-blue-200 dark:border-blue-800">
                  복수 선택 ({currentQ.answer.length}개)
                </span>
              )}
            </h2>

            <hr className="border-t border-gray-200 dark:border-slate-700 my-6" />

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
                      ${isSelected ? 'border-primary bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'}
                    `}
                    >
                      <div className="absolute right-3 top-3 hidden md:block opacity-0 group-hover:opacity-30 transition-opacity">
                        <span className="text-xs border border-gray-400 dark:border-slate-500 rounded px-1.5 py-0.5 text-gray-500 dark:text-slate-400 font-mono">
                          {idx + 1}
                        </span>
                      </div>

                      <div className={`
                      w-5 h-5 rounded-full border flex items-center justify-center mr-3 flex-shrink-0 mt-0.5
                      ${isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300 dark:border-slate-500 text-gray-500 dark:text-slate-400'}
                    `}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className="text-sm md:text-base text-gray-700 dark:text-slate-200 leading-snug">
                        {(showOriginal && currentQ.originalOptions && currentQ.originalOptions[idx])
                          ? stripLabel(currentQ.originalOptions[idx])
                          : stripLabel(opt)
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Explanation & Copy Actions */}
            <div className="border-t dark:border-slate-700 pt-4">
              <div className="flex items-center flex-wrap gap-y-3 gap-x-4 mb-4">
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center text-primary dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm md:text-base group"
                >
                  <HelpCircle className="w-5 h-5 mr-2" />
                  <span>{showExplanation ? "해설 숨기기" : "해설 보기"}</span>
                  <span className="ml-2 text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-mono inline-block group-hover:bg-gray-200 dark:group-hover:bg-slate-600">
                    S
                  </span>
                </button>

                {currentQ.originalQuestion && (
                  <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className={`flex items-center font-medium transition-colors text-sm md:text-base group ${showOriginal ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400'}`}
                  >
                    <Languages className="w-5 h-5 mr-2" />
                    <span>{showOriginal ? "한국어 보기" : "원문 보기"}</span>
                    <span className="ml-2 text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-mono inline-block group-hover:bg-gray-200 dark:group-hover:bg-slate-600">
                      O, 0
                    </span>
                  </button>
                )}

                <button
                  onClick={handleCopyQuestion}
                  className="flex items-center text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors text-sm md:text-base group"
                  title="AI에게 질문하기 위해 문제와 답 복사"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  <span>AI 질문 복사</span>
                  <span className="ml-2 text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-mono inline-block group-hover:bg-gray-200 dark:group-hover:bg-slate-600">
                    V
                  </span>
                </button>
              </div>

              {showExplanation && (
                <div
                  ref={explanationRef}
                  className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-warning/30 dark:border-yellow-700/30 rounded-lg text-gray-800 dark:text-slate-200 animate-fadeIn text-sm scroll-mt-20"
                >
                  <p className="font-semibold mb-1 text-warning/90">
                    정답: {(() => {
                      const correctLabels = currentQ.answer.split('').map(s => s.trim());
                      const found = currentQ.options
                        .filter(opt => correctLabels.includes(getOptionLabel(opt)))
                        .map(opt => stripLabel(opt));
                      return found.length > 0 ? found.join(', ') : currentQ.answer;
                    })()}
                  </p>
                  <div className="whitespace-pre-wrap">{currentQ.explanation}</div>
                </div>
              )}
            </div>
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
      <footer className="bg-white dark:bg-slate-800 border-t dark:border-slate-700 p-4 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 transition-colors duration-300">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className={`flex items-center px-4 py-2 rounded font-medium text-sm group transition-colors ${currentIdx === 0 ? 'text-gray-300 dark:text-slate-600' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            <div className="flex flex-col items-start">
              <span>이전</span>
              {currentIdx !== 0 && <span className="text-[10px] text-gray-400 font-normal block font-mono">[A]</span>}
            </div>
          </button>

          <span className="text-sm font-medium text-gray-500 dark:text-slate-500 sm:hidden">
            {currentIdx + 1} / {questions.length}
          </span>

          <button
            onClick={handleNext}
            className={`flex items-center px-4 py-2 rounded font-medium text-sm group transition-colors ${currentIdx === questions.length - 1 ? 'text-primary dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            <div className="flex flex-col items-end">
              <span>{currentIdx === questions.length - 1 ? '제출' : '다음'}</span>
              <span className={`text-[10px] font-normal block font-mono ${currentIdx === questions.length - 1 ? 'text-blue-300 dark:text-blue-500' : 'text-gray-400 dark:text-slate-500'}`}>
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
