
import React, { useState, useEffect, useMemo } from 'react';
import { Dataset, QuizConfig, UserTier } from '../types';
import { Settings, Play, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface SetupProps {
  datasets: Dataset[];
  onStart: (config: QuizConfig) => void;
  onBack: () => void;
  userTier: UserTier | null;
}

export const Setup: React.FC<SetupProps> = ({ datasets, onStart, onBack, userTier }) => {
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  // Default to 65 questions
  const [questionCount, setQuestionCount] = useState<number>(65);
  // Default to 120 minutes
  const [timeLimit, setTimeLimit] = useState<number>(120);
  const [maxQuestions, setMaxQuestions] = useState<number>(0);

  // Derive available exams
  const exams = useMemo(() => {
    const uniqueCodes = Array.from(new Set(datasets.map(d => d.examCode || 'Uncategorized')));
    return uniqueCodes.map(code => {
      const d = datasets.find(ds => (ds.examCode || 'Uncategorized') === code);
      return {
        code,
        name: d?.examName || code
      };
    });
  }, [datasets]);

  // Filter datasets by selected exam
  const currentDatasets = useMemo(() => {
    if (!selectedExam) return [];
    return datasets.filter(d => (d.examCode || 'Uncategorized') === selectedExam);
  }, [datasets, selectedExam]);

  useEffect(() => {
    // Calculate total questions available based on selection
    if (!selectedExam) {
      setMaxQuestions(0);
      return;
    }

    let total = currentDatasets
      .filter(d => selectedVersions.includes(d.id))
      .reduce((acc, curr) => acc + (curr.data?.length || 0), 0);

    // Cap total for non-VIP users
    if (userTier !== 'V' && total > 5) {
      total = 5;
    }

    setMaxQuestions(total);

    // Set initial count or adjust if it exceeds total
    if (userTier !== 'V') {
      // Standard users always capped at 5 (or less if total < 5)
      setQuestionCount(Math.min(total, 5));
      setTimeLimit(Math.min(total, 5) * 2);
    } else {
      // VIP users default to 65 or total if less
      if (questionCount > total && total > 0) {
        setQuestionCount(total);
        setTimeLimit(total * 2);
      } else if (total > 0 && questionCount === 0) {
        // Initialize reasonable default for VIP
        setQuestionCount(Math.min(65, total));
        setTimeLimit(Math.min(65, total) * 2);
      }
    }
  }, [selectedVersions, currentDatasets, selectedExam, userTier]);

  // Reset selection when exam changes
  useEffect(() => {
    setSelectedVersions([]);
  }, [selectedExam]);

  const toggleVersion = (id: string) => {
    setSelectedVersions(prev =>
      prev.includes(id)
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  };

  const handleQuestionCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value) || 0;

    // Ensure we don't exceed max available
    const effectiveMax = maxQuestions; // maxQuestions is already capped in useEffect
    if (effectiveMax > 0 && val > effectiveMax) {
      val = effectiveMax;
    }

    setQuestionCount(val);

    // Automatically adjust time limit: ~2 minutes per question
    if (val > 0) {
      setTimeLimit(val * 2);
    }
  };

  const handleStart = () => {
    if (selectedVersions.length === 0) return;
    onStart({
      selectedVersions,
      questionCount: Math.min(questionCount, maxQuestions),
      timeLimitMinutes: timeLimit
    });
  };

  const handleBack = () => {
    if (selectedExam) {
      setSelectedExam(null);
    } else {
      onBack();
    }
  };

  // Effective max is simply the total available (already capped for tiers).
  const effectiveMax = maxQuestions;

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-3 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              title="뒤로 가기"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Settings className="w-5 h-5 text-primary mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">시험 설정</h2>
          </div>

          {/* User Tier Badge (small) */}
          {userTier && (
            <div className={`
              px-3 py-1 rounded-full text-xs font-bold border
              ${userTier === 'V'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : userTier === 'N'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-gray-300'
              }
            `}>
              {userTier === 'V' ? '👑 VIP' : userTier === 'N' ? '😊 일반' : '👀 Guest'}
            </div>
          )}
        </div>

        {!selectedExam ? (
          /* Step 1: Exam Selection */
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-700">시험 선택</h3>
            <div className="grid grid-cols-1 gap-4">
              {exams.map(exam => (
                <button
                  key={exam.code}
                  onClick={() => setSelectedExam(exam.code)}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 transition-all text-left bg-white shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-lg mr-4">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{exam.code}</div>
                      <div className="text-sm text-gray-500">{exam.name}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>

            {exams.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                사용 가능한 시험이 없습니다.
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Question Bank Selection */
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4 flex items-center text-sm text-blue-800">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="font-semibold mr-1">선택된 시험:</span> {exams.find(e => e.code === selectedExam)?.name || selectedExam}
            </div>

            {/* Version Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">문제 은행 선택 (다중 선택 가능)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...currentDatasets]
                  .sort((a, b) => {
                    // Prioritize KR over EN, then alphabetical
                    const isAKR = a.name.includes('(KR)');
                    const isBKR = b.name.includes('(KR)');
                    if (isAKR && !isBKR) return -1;
                    if (!isAKR && isBKR) return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map(ds => {
                    // Parse language badge
                    let displayName = ds.name;
                    let lang: 'KR' | 'EN' | null = null;

                    if (displayName.includes('(KR)')) {
                      lang = 'KR';
                      displayName = displayName.replace('(KR)', '').trim();
                    } else if (displayName.includes('(EN)')) {
                      lang = 'EN';
                      displayName = displayName.replace('(EN)', '').trim();
                    }

                    return (
                      <div
                        key={ds.id}
                        onClick={() => toggleVersion(ds.id)}
                        className={`cursor-pointer p-3 border rounded-lg flex items-center justify-between transition-all ${selectedVersions.includes(ds.id)
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                      >
                        <div className="flex items-center text-sm">
                          {lang === 'KR' && (
                            <span className="mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                              KR
                            </span>
                          )}
                          {lang === 'EN' && (
                            <span className="mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                              EN
                            </span>
                          )}
                          <span className="font-medium text-gray-700">{displayName}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedVersions.includes(ds.id) ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                          }`}>
                          {selectedVersions.includes(ds.id) && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Question Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문제 수
                  {maxQuestions > 0 && <span className="font-normal text-gray-500 ml-1">(최대: {effectiveMax})</span>}
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    min="1"
                    max={effectiveMax > 0 ? effectiveMax : undefined}
                    value={questionCount}
                    onChange={handleQuestionCountChange}
                    disabled={selectedVersions.length === 0}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-primary focus:border-primary placeholder-gray-400 text-sm"
                  />
                  {userTier !== 'V' && questionCount >= 5 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      ⚠️ 일반 회원은 한번에 최대 5문제까지만 풀 수 있습니다.
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/80"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">문제당 약 2분으로 시간이 자동 계산됩니다.</p>
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">제한 시간 (분)</label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-primary focus:border-primary placeholder-gray-400 text-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleStart}
                disabled={selectedVersions.length === 0 || questionCount < 1}
                className={`w-full flex items-center justify-center py-2.5 px-4 rounded-lg font-semibold text-white transition-all text-sm ${selectedVersions.length === 0 || questionCount < 1
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-primary hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`}
              >
                <Play className="w-4 h-4 mr-2" />
                시험 시작
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
