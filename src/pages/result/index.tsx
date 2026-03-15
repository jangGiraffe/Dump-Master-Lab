
import React, { useState, useEffect, useRef } from 'react';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { Question } from '@/shared/model/types';
import { historyService } from '@/shared/api/historyService';
import { formatTime, ResultCharacter } from '@/shared/lib/utils';
import { Share2, RotateCcw, Home, Download, CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, Zap, Target, Swords, Bot, Copy, AlertTriangle, Languages } from 'lucide-react';
import { toPng } from 'html-to-image';
import { RandomQuote } from '@/shared/ui/RandomQuote';

interface ResultProps {
  questions: Question[];
  userAnswers: Record<string, string>;
  timeTakenSeconds: number;
  onRestart: () => void;
  onRetryWrong: (wrongQuestions: Question[]) => void;
  examCodes: string[];
}

const DashboardCard: React.FC<{ title: string; subtitle?: string; value: string | number; unit?: string; icon: React.ReactNode; color: string }> = ({ title, subtitle, value, unit, icon, color }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`}>
        {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${color.replace('bg-', 'text-')} ` })}
      </div>
      {subtitle && (
        <span className="text-[10px] font-bold text-gray-300 dark:text-slate-500 uppercase tracking-widest">{subtitle}</span>
      )}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 dark:text-slate-500 mb-1 uppercase tracking-tight">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-gray-800 dark:text-white tabular-nums">{value}</span>
        {unit && <span className="text-sm font-bold text-gray-400 dark:text-slate-500">{unit}</span>}
      </div>
    </div>
  </div>
);

const ImageResultCard: React.FC<{ score: number }> = ({ score }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 flex items-center justify-center hover:shadow-md transition-shadow duration-200 min-h-[140px]">
    <ResultCharacter score={score} size={84} />
  </div>
);

export const Result: React.FC<ResultProps> = ({ questions, userAnswers, timeTakenSeconds, onRestart, onRetryWrong, examCodes }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const resultCardRef = React.useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const wrongQuestions = questions.filter(q => {
    const isError = !q.options || q.options.length === 0 || !q.answer || q.answer.trim() === '';
    if (isError) return false; // Error questions are always treated as correct
    return userAnswers[q.id] !== q.answer;
  });
  const correctCount = questions.length - wrongQuestions.length;

  const score = Math.round((correctCount / questions.length) * 100);
  const isPass = score >= 72;

  // Time metrics
  const totalTimeStr = formatTime(timeTakenSeconds);
  const avgTimePerQuestion = questions.length > 0 ? Math.round(timeTakenSeconds / questions.length) : 0;

  const toggleExpand = (id: string) => {
    const isExpanding = expandedId !== id;
    setExpandedId(isExpanding ? id : null);

    if (isExpanding) {
      setTimeout(() => {
        itemRefs.current[id]?.focus({ preventScroll: false });
        itemRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  };

  const downloadResultImage = async () => {
    if (resultCardRef.current === null) return;
    try {
      const dataUrl = await toPng(resultCardRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0' // Remove border radius for the full image capture if needed
        }
      });
      const link = document.createElement('a');
      link.download = `dump - master - result - ${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      showToast('이미지 생성에 실패했습니다.');
    }
  };


  return (
    <div className="flex flex-col flex-grow bg-gray-50 dark:bg-slate-900 p-4 md:p-8 animate-fadeIn transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        {/* Score Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-slideIn transition-colors duration-300">
          <div ref={resultCardRef} className="p-8 text-center bg-white dark:bg-slate-800">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">시험 결과</h2>
            <div className="flex justify-center items-center mb-4">
              <ResultCharacter score={score} size={140} />
            </div>
            <div className="flex justify-center items-center mb-6">
              <div className={`text-5xl font-bold ${isPass ? 'text-success' : 'text-danger'} `}>
                {score}%
              </div>
            </div>
            <div className="mb-6">
              <span className={`px-3 py-1.5 rounded-full text-base font-medium ${isPass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} `}>
                {isPass ? '합격' : '불합격'}
              </span>
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">합격 기준: 72%</p>
            </div>
            <p className="text-gray-600 dark:text-slate-300 mb-2 text-sm md:text-base">
              총 {questions.length}문제 중 {correctCount}문제를 맞히셨습니다.
            </p>
          </div>

          {/* Buttons - Outside ref area to exclude from image download */}
          <div className="p-6 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={onRestart}
              className="flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 font-semibold py-2 px-6 rounded-lg transition-colors text-sm w-full sm:w-auto"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              처음으로
            </button>
            <button
              onClick={downloadResultImage}
              className="flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm w-full sm:w-auto shadow-md"
            >
              <Download className="w-4 h-4 mr-2" />
              이미지로 저장
            </button>
            <button
              onClick={() => {
                const text = `🏆 Dump Master Lab 시험 결과\n\n점수: ${score}%\n결과: ${isPass ? '합격 🎉' : '불합격 😅'} \n전체 ${questions.length}문제 중 ${correctCount}문제 정답!\n\n나의 성장을 확인해보세요! #DumpMasterLab #열공`;
                navigator.clipboard.writeText(text).then(() => showToast("공유 문구가 복사되었습니다! SNS에 게시해보세요."));
              }}
              className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm w-full sm:w-auto shadow-md"
            >
              <Share2 className="w-4 h-4 mr-2" />
              합격 인증 공유하기
            </button>
          </div>
        </div>

        <RandomQuote />

        {/* Retry Wrong Section (Modified from AI Insight) */}
        {wrongQuestions.length > 0 && (
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative animate-slideIn delay-150">
            <Swords className="absolute top-[-20px] right-[-20px] w-32 h-32 text-white/10 rotate-12" />
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg tracking-tight">틀린 문제 다시 풀기</h3>
            </div>
            <p className="text-blue-50 text-sm leading-relaxed mb-4">
              {isPass
                ? `합격권이지만 아쉽게 놓친 ${wrongQuestions.length}문제가 있습니다.지금 바로 복습하여 완벽한 만점에 도전해보세요.`
                : `아직 부족한 ${wrongQuestions.length}문제를 정복해야 합격할 수 있습니다.틀린 문제들을 다시 풀어보며 확실하게 내 것으로 만드세요.`
              }
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onRetryWrong(wrongQuestions)}
                className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors py-2.5 px-6 rounded-xl text-sm font-bold shadow-md flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                오답 정복하러 가기 ({wrongQuestions.length})
              </button>
              <button
                onClick={() => {
                  const wrongQuestionsText = wrongQuestions.map((q, idx) => `
문제 ${idx + 1}: ${q.question}
답: ${q.answer}
해설: ${q.explanation}
`).join('\n---\n');

                  const prompt = `다음은 내가 틀린 문제들이다. [${examCodes.join(', ')}] 시험의 기출문제들이야. 이 문제들과 비슷한 유형의 퀴즈를 내줘:\n\n${wrongQuestionsText}`;

                  navigator.clipboard.writeText(prompt).then(() => {
                    showToast('틀린 문제들이 복사되었습니다. 제미나이에게 붙여넣어 비슷한 문제를 요청해보세요!');
                  });
                }}
                className="bg-indigo-500/20 hover:bg-indigo-500/30 text-white border border-white/20 transition-colors py-2.5 px-6 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 backdrop-blur-sm"
              >
                <Bot className="w-4 h-4" />
                AI에게 비슷한 문제 요청하기
              </button>
            </div>
          </div>
        )}
        {/* Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          <div className="animate-slideInStagger1"><ImageResultCard score={score} /></div>
          <div className="animate-slideInStagger2">
            <DashboardCard
              title="총 소요 시간"
              value={totalTimeStr.split(':')[0]}
              unit={`분 ${totalTimeStr.split(':')[1]} 초`}
              icon={<Clock />}
              color="bg-blue-600"
            />
          </div>
          <div className="animate-slideInStagger3">
            <DashboardCard
              title="평균 속도"
              subtitle="Per Q"
              value={avgTimePerQuestion}
              unit="초"
              icon={<Zap />}
              color="bg-amber-500"
            />
          </div>
          <div className="animate-slideInStagger4">
            <DashboardCard
              title="정답 개수"
              value={correctCount}
              unit={`/ ${questions.length} `}
              icon={<Target />}
              color="bg-emerald-600"
            />
          </div>
        </div>
        {/* Review List */}
        <div className="space-y-4 animate-slideInStagger4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white ml-1">상세 검토</h3>
          {questions.map((q, idx) => {
            const userAnswer = userAnswers[q.id];
            const isError = !q.options || q.options.length === 0 || !q.answer || q.answer.trim() === '';
            const isCorrect = isError || userAnswer === q.answer;
            const isExpanded = expandedId === q.id;

            return (
              <div
                key={q.id}
                ref={el => itemRefs.current[q.id] = el}
                tabIndex={-1}
                className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border ${isCorrect ? 'border-gray-200 dark:border-slate-700' : 'border-red-200 dark:border-red-800'} overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/20`}
              >
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-start gap-4 group"
                >
                  <div className="mt-1">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-danger" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-800 dark:text-white text-sm">문제 {idx + 1}</h4>
                        {(!q.options || q.options.length === 0 || !q.answer || q.answer.trim() === '') && (
                          <span className="inline-flex items-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            오류
                          </span>
                        )}
                      </div>
                      <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-1 rounded">
                        {q.sourceVersion}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-slate-300 text-xs md:text-sm mt-1 line-clamp-2">{q.question}</p>
                  </div>
                  <div className="mt-1 text-gray-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-start mb-4">
                      <p className="whitespace-pre-wrap text-gray-800 dark:text-slate-200 font-medium text-sm md:text-base flex-grow">
                        {(showOriginal && q.originalQuestion) ? q.originalQuestion : q.question}
                      </p>
                      {q.originalQuestion && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowOriginal(!showOriginal); }}
                          className={`ml-2 p-1.5 rounded-lg border transition-colors ${showOriginal ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200' : 'bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-slate-400 border-gray-100 hover:text-purple-600'}`}
                          title={q.sourceVersion?.startsWith('kr-') ? (showOriginal ? "한국어 보기" : "원문 보기") : (showOriginal ? "원문 보기" : "번역 보기")}
                        >
                          <Languages className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {(!q.options || q.options.length === 0 || !q.answer || q.answer.trim() === '') && (
                      <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-lg mb-4 text-xs md:text-sm text-red-700 dark:text-red-400 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p>
                          {(!q.answer || q.answer.trim() === '')
                            ? "정답 데이터가 없거나 잘못되었습니다."
                            : "선택지 데이터가 없습니다."
                          } 시스템에 의해 자동으로 정답 처리되었습니다.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, i) => {
                        const stripLabel = (text: string) => text.replace(/^[A-Z]\.\s*/, '');
                        const label = opt.split('.')[0].trim();
                        let optClass = "p-2 border rounded text-xs md:text-sm text-gray-600 dark:text-slate-400 dark:border-slate-600";

                        if (q.answer.includes(label)) {
                          optClass = "p-2 border border-success bg-green-50 dark:bg-green-900/20 rounded text-xs md:text-sm font-medium text-green-900 dark:text-green-300";
                        } else if (userAnswer && userAnswer.includes(label) && !q.answer.includes(label)) {
                          optClass = "p-2 border border-danger bg-red-50 dark:bg-red-900/20 rounded text-xs md:text-sm text-red-900 dark:text-red-300";
                        }

                        return (
                          <div key={i} className={optClass}>
                            {(showOriginal && q.originalOptions && q.originalOptions[i])
                              ? stripLabel(q.originalOptions[i])
                              : stripLabel(opt)
                            }
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded border border-yellow-100 dark:border-yellow-700/30 text-xs md:text-sm mb-4">
                      <p className="font-semibold text-warning/90 mb-1">해설:</p>
                      <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{(showOriginal && q.originalExplanation) ? q.originalExplanation : q.explanation}</p>
                    </div>

                    <div className="flex justify-start">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const getFullText = (labels: string) => {
                            if (!q.options || q.options.length === 0) return labels;
                            const labelArr = labels.split('').map(s => s.trim());
                            const matched = q.options
                              .filter(opt => labelArr.includes(opt.split('.')[0].trim()))
                              .map(opt => opt.replace(/^[A-Z]\.\s*/, ''));
                            return matched.length > 0 ? matched.join(', ') : labels;
                          };
                          const correctText = getFullText(q.answer);
                          const userText = userAnswer ? getFullText(userAnswer) : "선택하지 않음";
                          const allOptionsText = q.options.map(opt => opt.replace(/^[A-Z]\.\s*/, '')).join('\n');
                          const text = `${q.question} 에 대한 답은 ${correctText} 이고, 나는 ${userText}을 골랐어.알려줘.\n다른 선택지는\n${allOptionsText} \n 이 있어.설명을 부탁해.\n시험 대비 팁도 알려줘.`;

                          navigator.clipboard.writeText(text).then(() => {
                            setCopiedId(q.id);
                            showToast("클립보드에 복사되었습니다! 제미나이나 ChatGPT 등에 붙여넣어 질문해보세요.");
                            setTimeout(() => setCopiedId(null), 2000);
                          });
                        }}
                        className={`flex items-center text-xs font-medium px-3 py-1.5 rounded transition-all shadow-sm ${copiedId === q.id ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'} `}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        {copiedId === q.id ? "복사 완료!" : "AI에게 할 질문 복사하기"}
                      </button>
                    </div>
                  </div>
                )
                }
              </div>
            );
          })}
        </div>
      </div>
      {/* Global Toast Message */}
      {toastMsg && (
        <div className="fixed top-8 left-0 w-full z-[200] flex justify-center pointer-events-none">
          <div className="animate-slideUp pointer-events-auto bg-indigo-600/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl border border-white/20 flex items-center gap-3">
            <Bot className="w-5 h-5 text-indigo-200" />
            {toastMsg}
          </div>
        </div>
      )}
    </div >
  );
};
