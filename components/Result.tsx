import React, { useState } from 'react';
import { Question } from '../types';
import { historyService } from '../services/historyService';
import { formatTime, ResultCharacter } from '../utils';
import { CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp, Copy, Clock, Zap, Target, Share2, Sparkles, Swords, Download } from 'lucide-react';
import { toPng } from 'html-to-image';

interface ResultProps {
  questions: Question[];
  userAnswers: Record<string, string>;
  timeTakenSeconds: number;
  onRestart: () => void;
  onRetryWrong: (wrongQuestions: Question[]) => void;
}

const DashboardCard: React.FC<{ title: string; subtitle?: string; value: string | number; unit?: string; icon: React.ReactNode; color: string }> = ({ title, subtitle, value, unit, icon, color }) => (
  <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`}>
        {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${color.replace('bg-', 'text-')}` })}
      </div>
      {subtitle && (
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{subtitle}</span>
      )}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-tight">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-gray-800 tabular-nums">{value}</span>
        {unit && <span className="text-sm font-bold text-gray-400">{unit}</span>}
      </div>
    </div>
  </div>
);

const ImageResultCard: React.FC<{ score: number }> = ({ score }) => (
  <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex items-center justify-center hover:shadow-md transition-shadow duration-200 min-h-[140px]">
    <ResultCharacter score={score} size={84} />
  </div>
);

export const Result: React.FC<ResultProps> = ({ questions, userAnswers, timeTakenSeconds, onRestart, onRetryWrong }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const resultCardRef = React.useRef<HTMLDivElement>(null);

  const wrongQuestions = questions.filter(q => userAnswers[q.id] !== q.answer);
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
      link.download = `dump-master-result-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
      alert('이미지 생성에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col flex-grow bg-gray-50 p-4 md:p-8 animate-fadeIn">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Score Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 animate-slideIn">
          <div ref={resultCardRef} className="p-8 text-center bg-white">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">시험 결과</h2>
            <div className="flex justify-center items-center mb-4">
              <ResultCharacter score={score} size={140} />
            </div>
            <div className="flex justify-center items-center mb-6">
              <div className={`text-5xl font-bold ${isPass ? 'text-success' : 'text-danger'}`}>
                {score}%
              </div>
            </div>
            <div className="mb-6">
              <span className={`px-3 py-1.5 rounded-full text-base font-medium ${isPass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isPass ? '합격' : '불합격'}
              </span>
              <p className="mt-2 text-sm text-gray-500">합격 기준: 72%</p>
            </div>
            <p className="text-gray-600 mb-2 text-sm md:text-base">
              총 {questions.length}문제 중 {correctCount}문제를 맞히셨습니다.
            </p>
          </div>

          {/* Buttons - Outside ref area to exclude from image download */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={onRestart}
              className="flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold py-2 px-6 rounded-lg transition-colors text-sm w-full sm:w-auto"
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
                const text = `🏆 Dump Master Lab 시험 결과\n\n점수: ${score}%\n결과: ${isPass ? '합격 🎉' : '불합격 😅'}\n전체 ${questions.length}문제 중 ${correctCount}문제 정답!\n\n나의 성장을 확인해보세요! #DumpMasterLab #열공`;
                navigator.clipboard.writeText(text).then(() => alert("공유 문구가 복사되었습니다! SNS에 게시해보세요."));
              }}
              className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm w-full sm:w-auto shadow-md"
            >
              <Share2 className="w-4 h-4 mr-2" />
              합격 인증 공유하기
            </button>
          </div>
        </div>

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
                ? `합격권이지만 아쉽게 놓친 ${wrongQuestions.length}문제가 있습니다. 지금 바로 복습하여 완벽한 만점에 도전해보세요.`
                : `아직 부족한 ${wrongQuestions.length}문제를 정복해야 합격할 수 있습니다. 틀린 문제들을 다시 풀어보며 확실하게 내 것으로 만드세요.`
              }
            </p>
            <button
              onClick={() => onRetryWrong(wrongQuestions)}
              className="bg-white text-indigo-600 hover:bg-blue-50 transition-colors py-2.5 px-6 rounded-xl text-sm font-bold shadow-md"
            >
              오답 정복하러 가기 ({wrongQuestions.length}) →
            </button>
          </div>
        )}
        {/* Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          <div className="animate-slideInStagger1"><ImageResultCard score={score} /></div>
          <div className="animate-slideInStagger2">
            <DashboardCard
              title="총 소요 시간"
              value={totalTimeStr.split(':')[0]}
              unit={`분 ${totalTimeStr.split(':')[1]}초`}
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
              unit={`/ ${questions.length}`}
              icon={<Target />}
              color="bg-emerald-600"
            />
          </div>
        </div>
        {/* Review List */}
        <div className="space-y-4 animate-slideInStagger4">
          <h3 className="text-lg font-semibold text-gray-800 ml-1">상세 검토</h3>
          {questions.map((q, idx) => {
            const userAnswer = userAnswers[q.id];
            const isCorrect = userAnswer === q.answer;
            const isExpanded = expandedId === q.id;

            return (
              <div
                key={q.id}
                ref={el => itemRefs.current[q.id] = el}
                tabIndex={-1}
                className={`bg-white rounded-lg shadow-sm border ${isCorrect ? 'border-gray-200' : 'border-red-200'} overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/20`}
              >
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 flex items-start gap-4 group"
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
                      <h4 className="font-medium text-gray-800 pr-4 text-sm">문제 {idx + 1}</h4>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                        {q.sourceVersion}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs md:text-sm mt-1 line-clamp-2">{q.question}</p>
                  </div>
                  <div className="mt-1 text-gray-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t bg-gray-50/50">
                    <p className="whitespace-pre-wrap text-gray-800 mb-4 font-medium text-sm md:text-base">{q.question}</p>

                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, i) => {
                        const label = opt.split('.')[0].trim();
                        let optClass = "p-2 border rounded text-xs md:text-sm text-gray-600";

                        if (q.answer.includes(label)) {
                          optClass = "p-2 border border-success bg-green-50 rounded text-xs md:text-sm font-medium text-green-900";
                        } else if (userAnswer && userAnswer.includes(label) && !q.answer.includes(label)) {
                          optClass = "p-2 border border-danger bg-red-50 rounded text-xs md:text-sm text-red-900";
                        }

                        return (
                          <div key={i} className={optClass}>
                            {opt}
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-xs md:text-sm mb-4">
                      <p className="font-semibold text-warning/90 mb-1">해설:</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{q.explanation}</p>
                    </div>

                    <div className="flex justify-start">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const getFullText = (labels: string) => {
                            if (!q.options || q.options.length === 0) return labels;
                            const labelArr = labels.split('').map(s => s.trim());
                            const matched = q.options.filter(opt => labelArr.includes(opt.split('.')[0].trim()));
                            return matched.length > 0 ? matched.join(', ') : labels;
                          };
                          const correctText = getFullText(q.answer);
                          const userText = userAnswer ? getFullText(userAnswer) : "선택하지 않음";
                          const allOptionsText = q.options.join('\n');
                          const text = `${q.question} 에 대한 답은 ${correctText} 이고, 나는 ${userText}을 골랐어. 알려줘.\n다른 선택지는\n${allOptionsText}\n 이 있어.설명을 부탁해. \n시험 대비 팁도 알려줘.`;

                          navigator.clipboard.writeText(text).then(() => {
                            setCopiedId(q.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          });
                        }}
                        className={`flex items-center text-xs font-medium px-3 py-1.5 rounded transition-all shadow-sm ${copiedId === q.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        {copiedId === q.id ? "복사 완료!" : "AI에게 할 질문 복사하기"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
