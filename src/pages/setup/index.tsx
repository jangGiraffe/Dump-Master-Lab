import React, { useState, useEffect, useMemo } from 'react';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { Dataset, Question, UserTier, QuizConfig } from '@/shared/model/types';
import { Settings, Play, ChevronLeft, ChevronRight, BookOpen, Info } from 'lucide-react';
import { examService } from '@/shared/api/examService';

interface SetupProps {
  datasets: Dataset[];
  onStart: (config: QuizConfig) => void;
  onBack: () => void;
  userTier: UserTier | null;
  isBossRaid?: boolean;
  wrongQuestionIds?: string[];
}

export const Setup: React.FC<SetupProps> = ({
  datasets,
  onStart,
  onBack,
  userTier,
  isBossRaid = false,
  wrongQuestionIds = []
}) => {
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  // Default to 65 questions
  const [questionCount, setQuestionCount] = useState<number>(65);
  // Default to 120 minutes
  const [timeLimit, setTimeLimit] = useState<number>(120);
  const [maxQuestions, setMaxQuestions] = useState<number>(0);
  const [isManualCount, setIsManualCount] = useState<boolean>(false);

  // Derive available exams and enrich with ExamService
  const exams = useMemo(() => {
    const datasetCodes = new Set(datasets.map(d => d.examCode || 'Uncategorized'));
    const allKnownExams = examService.getAllExams();

    // Start with all known exams from ExamService
    const list = allKnownExams.map(examInfo => ({
      code: examInfo.code,
      name: examInfo.name,
      description: examInfo.description,
      officialTime: examInfo.officialTimeLimitMinutes,
      officialCount: examInfo.officialQuestionCount,
      hasData: datasetCodes.has(examInfo.code)
    }));

    // Add any exams from datasets that aren't in ExamService
    datasetCodes.forEach(code => {
      const codeStr = code as string;
      if (!list.find(e => e.code === codeStr)) {
        list.push({
          code: codeStr,
          name: codeStr,
          description: '해당 시험에 대한 정보가 없습니다.',
          officialTime: undefined,
          officialCount: undefined,
          hasData: true
        });
      }
    });

    // If Boss Raid, further filter out exams that have NO wrong answers
    if (isBossRaid && wrongQuestionIds.length > 0) {
      return list.filter(exam => {
        if (!exam.hasData) return false;
        const examDatasets = datasets.filter(d => (d.examCode || 'Uncategorized') === exam.code);
        // Check if any question in these datasets is in wrongQuestionIds
        return examDatasets.some(ds => {
          return ds.data.some((_, idx) => wrongQuestionIds.includes(`${ds.id}-${idx}`));
        });
      });
    }

    return list;
  }, [datasets, isBossRaid, wrongQuestionIds]);

  const handleExamClick = (exam: typeof exams[0]) => {
    if (!exam.hasData) {
      alert(`[${exam.code}] 시험은 현재 준비 중입니다.\n데이터가 업데이트되는 대로 이용 가능합니다.`);
      return;
    }
    setSelectedExam(exam.code);
  };

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

    let total = 0;
    const selectedDatasets = currentDatasets.filter(d => selectedVersions.includes(d.id));

    if (isBossRaid) {
      // Only count questions that are in the wrongQuestionIds list
      selectedDatasets.forEach(ds => {
        ds.data.forEach((_, idx) => {
          if (wrongQuestionIds.includes(`${ds.id}-${idx}`)) {
            total++;
          }
        });
      });
    } else {
      total = selectedDatasets.reduce((acc, curr) => acc + (curr.data?.length || 0), 0);
    }

    // Cap total for non-VIP users? 
    // Usually Boss Raid is for VIP or special cases, but let's keep the 5-cap if needed
    if (userTier !== 'V' && total > 5) {
      total = 5;
    }

    setMaxQuestions(total);

    // Get official info for the current exam
    const examInfo = selectedExam ? examService.getExamByCode(selectedExam) : null;
    const defaultCount = examInfo?.officialQuestionCount || 65;
    const defaultTime = examInfo?.officialTimeLimitMinutes || 120;
    const timePerQuestion = (examInfo?.officialTimeLimitMinutes && examInfo?.officialQuestionCount)
      ? examInfo.officialTimeLimitMinutes / examInfo.officialQuestionCount
      : 2;

    // Set initial count or adjust if it exceeds total
    if (userTier !== 'V') {
      // Standard users always capped at 5 (or less if total < 5)
      const count = Math.min(total, 5);
      setQuestionCount(count);
      setTimeLimit(Math.round(count * timePerQuestion));
    } else {
      // VIP users: Initialize or adapt to total
      if (total > 0) {
        // If it's the first time selecting or total changed significantly
        const newCount = Math.min(defaultCount, total);
        setQuestionCount(newCount);
        setTimeLimit(Math.round(newCount * timePerQuestion));
      }
    }
  }, [selectedVersions, currentDatasets, selectedExam, userTier]);

  // Reset selection when exam changes — default to first item
  useEffect(() => {
    if (selectedExam) {
      const sorted = datasets
        .filter(d => (d.examCode || 'Uncategorized') === selectedExam)
        .sort((a, b) => {
          const isAKR = a.name.includes('(KR)');
          const isBKR = b.name.includes('(KR)');
          if (isAKR && !isBKR) return -1;
          if (!isAKR && isBKR) return 1;
          return a.name.localeCompare(b.name);
        });
      setSelectedVersions(sorted.length > 0 ? [sorted[0].id] : []);
    } else {
      setSelectedVersions([]);
    }
  }, [selectedExam, datasets]);

  const toggleVersion = (id: string) => {
    setSelectedVersions(prev =>
      prev.includes(id)
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  };

  const handleLanguageSelect = (lang: 'KR' | 'EN' | 'ALL' | 'NONE') => {
    if (lang === 'NONE') {
      setSelectedVersions([]);
      return;
    }

    const targetDatasets = lang === 'ALL'
      ? currentDatasets
      : currentDatasets.filter(d => d.name.includes(`(${lang})`));

    const targetIds = targetDatasets.map(d => d.id);

    setSelectedVersions(prev => {
      const newSet = new Set([...prev, ...targetIds]);
      return Array.from(newSet);
    });
  };

  const handleQuestionCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value) || 0;

    // Ensure we don't exceed max available
    const effectiveMax = maxQuestions;
    if (effectiveMax > 0 && val > effectiveMax) {
      val = effectiveMax;
    }

    setQuestionCount(val);

    // Automatically adjust time limit based on exam's ratio
    const examInfo = selectedExam ? examService.getExamByCode(selectedExam) : null;
    const timePerQuestion = (examInfo?.officialTimeLimitMinutes && examInfo?.officialQuestionCount)
      ? examInfo.officialTimeLimitMinutes / examInfo.officialQuestionCount
      : 2;

    if (val > 0) {
      setTimeLimit(Math.round(val * timePerQuestion));
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
    <div className="flex flex-col items-center justify-center flex-grow p-4 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-2xl border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-3 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 dark:text-slate-400"
              title="뒤로 가기"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Settings className="w-5 h-5 text-primary mr-2" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {isBossRaid ? '오답 문제풀이 설정' : '시험 설정'}
            </h2>
          </div>


          {/* User Mode Badge */}
          <div className="flex gap-2 items-center">
            {isBossRaid && (
              <div className="px-3 py-1 rounded-full text-xs font-bold border bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                👹 WRONG ANSWERS
              </div>
            )}
            {userTier && (
              <div className={`
                px-3 py-1 rounded-full text-xs font-bold border
                ${userTier === 'V'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                  : userTier === 'N'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                    : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                }
              `}>
                {userTier === 'V' ? '👑 VIP' : userTier === 'N' ? '😊 일반' : '👀 Guest'}
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>

        {!selectedExam ? (
          /* Step 1: Exam Selection */
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-700 dark:text-slate-300">시험 선택</h3>
            <div className="grid grid-cols-1 gap-4">
              {exams.map(exam => (
                <button
                  key={exam.code}
                  onClick={() => handleExamClick(exam)}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-all text-left shadow-sm hover:shadow-md ${exam.hasData
                    ? 'border-gray-200 dark:border-slate-600 hover:border-primary dark:hover:border-primary hover:bg-blue-50 dark:hover:bg-slate-700/50 bg-white dark:bg-slate-800'
                    : 'border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 opacity-70 grayscale-[0.5]'
                    }`}
                >
                  <div className="flex items-center">
                    <div className={`${exam.hasData ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-200 dark:bg-slate-700'} p-2 rounded-lg mr-4`}>
                      <BookOpen className={`w-6 h-6 ${exam.hasData ? 'text-primary dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-gray-800 dark:text-white">{exam.code}</div>
                        {!exam.hasData && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold border border-amber-200 dark:border-amber-800">
                            준비 중
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-700 dark:text-slate-300">{exam.name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">{exam.description}</div>
                      {(exam.officialCount || exam.officialTime) && (
                        <div className="flex gap-2 mt-2">
                          {exam.officialCount && (
                            <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600">
                              문항: {exam.officialCount}문항
                            </span>
                          )}
                          {exam.officialTime && (
                            <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600">
                              시간: {exam.officialTime}분
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {exam.hasData && <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-600" />}
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
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md p-3 mb-4 flex items-center text-sm text-blue-800 dark:text-blue-300">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="font-semibold mr-1">선택된 시험:</span> {exams.find(e => e.code === selectedExam)?.name || selectedExam}
            </div>

            {/* Version Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {isBossRaid ? '오답 문제 은행 선택' : '문제 은행 선택'} (다중 선택 가능)
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                {currentDatasets.some(ds => ds.name.includes('(KR)')) && (
                  <button
                    onClick={() => handleLanguageSelect('KR')}
                    className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1.5"
                  >
                    <img src="https://flagcdn.com/w20/kr.png" width="16" alt="KR" className="rounded-sm" />
                    <span>KR 전체 선택</span>
                  </button>
                )}
                {currentDatasets.some(ds => ds.name.includes('(EN)')) && (
                  <button
                    onClick={() => handleLanguageSelect('EN')}
                    className="px-2.5 py-1 text-[10px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5"
                  >
                    <img src="https://flagcdn.com/w20/us.png" width="16" alt="EN" className="rounded-sm" />
                    <span>EN 전체 선택</span>
                  </button>
                )}
                <button
                  onClick={() => handleLanguageSelect('ALL')}
                  className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  모두 선택
                </button>
                <button
                  onClick={() => handleLanguageSelect('NONE')}
                  className="px-2.5 py-1 text-[10px] font-bold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  모두 해제
                </button>
              </div>
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
                          ? 'border-primary bg-primary/5 dark:bg-primary/20 shadow-sm'
                          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800'
                          }`}
                      >
                        <div className="flex items-center text-sm">
                          {lang === 'KR' && (
                            <span className="mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                              <img src="https://flagcdn.com/w20/kr.png" width="14" alt="KR" className="rounded-sm" /> KR
                            </span>
                          )}
                          {lang === 'EN' && (
                            <span className="mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-600 flex items-center gap-1.5">
                              <img src="https://flagcdn.com/w20/us.png" width="14" alt="EN" className="rounded-sm" /> EN
                            </span>
                          )}
                          <span className="font-medium text-gray-700 dark:text-slate-300">{displayName}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedVersions.includes(ds.id) ? 'border-primary bg-primary' : 'border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-700'
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
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  문제 수
                  {maxQuestions > 0 && <span className="font-normal text-gray-500 dark:text-slate-500 ml-1">(최대: {effectiveMax})</span>}
                </label>

                <div className="flex flex-wrap gap-2 mb-3">
                  {[5, 10, 20].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => {
                        const examInfo = selectedExam ? examService.getExamByCode(selectedExam) : null;
                        const timePerQuestion = (examInfo?.officialTimeLimitMinutes && examInfo?.officialQuestionCount)
                          ? examInfo.officialTimeLimitMinutes / examInfo.officialQuestionCount
                          : 2;
                        const val = Math.min(cnt, effectiveMax);
                        setQuestionCount(val);
                        setTimeLimit(Math.round(val * timePerQuestion));
                        setIsManualCount(false);
                      }}
                      className={`px-4 py-1.5 rounded-md text-xs font-semibold border transition-all ${!isManualCount && questionCount === cnt
                        ? 'bg-primary border-primary text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-500'
                        } ${cnt > effectiveMax ? 'opacity-40 cursor-not-allowed' : ''}`}
                      disabled={cnt > effectiveMax && userTier === 'V'}
                    >
                      {cnt}개
                    </button>
                  ))}
                  {/* Official Count Button */}
                  {(() => {
                    const examInfo = selectedExam ? examService.getExamByCode(selectedExam) : null;
                    const offCnt = examInfo?.officialQuestionCount;
                    if (offCnt && ![5, 10, 20].includes(offCnt)) {
                      return (
                        <button
                          key="official"
                          type="button"
                          onClick={() => {
                            const val = Math.min(offCnt, effectiveMax);
                            setQuestionCount(val);
                            const timePerQuestion = (examInfo?.officialTimeLimitMinutes && examInfo?.officialQuestionCount)
                              ? examInfo.officialTimeLimitMinutes / examInfo.officialQuestionCount
                              : 2;
                            setTimeLimit(Math.round(val * timePerQuestion));
                            setIsManualCount(false);
                          }}
                          className={`px-4 py-1.5 rounded-md text-xs font-semibold border transition-all ${!isManualCount && questionCount === offCnt
                            ? 'bg-primary border-primary text-white shadow-sm'
                            : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-500'
                            } ${offCnt > effectiveMax ? 'opacity-40 cursor-not-allowed' : ''}`}
                          disabled={offCnt > effectiveMax && userTier === 'V'}
                        >
                          공식({offCnt}개)
                        </button>
                      );
                    }
                    return null;
                  })()}
                  <button
                    type="button"
                    onClick={() => setIsManualCount(true)}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold border transition-all ${isManualCount
                      ? 'bg-primary border-primary text-white shadow-sm'
                      : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                  >
                    직접 입력
                  </button>
                </div>

                {isManualCount && (
                  <div className="relative group animate-fadeIn">
                    <input
                      type="number"
                      min="1"
                      max={effectiveMax > 0 ? effectiveMax : undefined}
                      value={questionCount}
                      onChange={handleQuestionCountChange}
                      disabled={selectedVersions.length === 0}
                      autoFocus
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-md focus:ring-primary focus:border-primary placeholder-gray-400 dark:placeholder-slate-500 text-sm"
                      placeholder="문제 수를 입력하세요"
                    />
                    {userTier !== 'V' && questionCount >= 5 && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        ⚠️ 일반 회원은 한번에 최대 5문제까지만 풀 수 있습니다.
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/80"></div>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">선택한 시험의 공식 시간 비율에 따라 제한 시간이 자동으로 계산됩니다.</p>
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">제한 시간 (분)</label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-md focus:ring-primary focus:border-primary placeholder-gray-400 dark:placeholder-slate-500 text-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={handleStart}
                disabled={selectedVersions.length === 0 || questionCount < 1}
                className={`w-full flex items-center justify-center py-2.5 px-4 rounded-lg font-semibold text-white transition-all text-sm ${selectedVersions.length === 0 || questionCount < 1
                  ? 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed'
                  : isBossRaid
                    ? 'bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg'
                    : 'bg-primary hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`}
              >
                <Play className="w-4 h-4 mr-2" />
                {isBossRaid ? '문제풀이 시작' : '시험 시작'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
