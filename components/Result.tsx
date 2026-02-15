
import React, { useState } from 'react';
import { Question } from '../types';
import { ResultCharacter } from '../utils';
import { CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface ResultProps {
  questions: Question[];
  userAnswers: Record<string, string>;
  onRestart: () => void;
  onRetryWrong: (wrongQuestions: Question[]) => void;
}

export const Result: React.FC<ResultProps> = ({ questions, userAnswers, onRestart, onRetryWrong }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const wrongQuestions = questions.filter(q => userAnswers[q.id] !== q.answer);
  const correctCount = questions.length - wrongQuestions.length;

  const score = Math.round((correctCount / questions.length) * 100);
  const isPass = score >= 72; // Changed from 80 to 72

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex flex-col flex-grow bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Score Card */}
        <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
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
          <p className="text-gray-600 mb-6 text-sm md:text-base">
            총 {questions.length}문제 중 {correctCount}문제를 맞히셨습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mx-auto">
            <button
              onClick={onRestart}
              className="flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-colors text-sm w-full sm:w-auto"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              처음으로
            </button>
            {wrongQuestions.length > 0 && (
              <button
                onClick={() => onRetryWrong(wrongQuestions)}
                className="flex items-center justify-center bg-primary hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm w-full sm:w-auto"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                틀린 문제 다시 풀기 ({wrongQuestions.length})
              </button>
            )}
          </div>
        </div>

        {/* Review List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 ml-1">상세 검토</h3>
          {questions.map((q, idx) => {
            const userAnswer = userAnswers[q.id];
            const isCorrect = userAnswer === q.answer;
            const isExpanded = expandedId === q.id;

            return (
              <div key={q.id} className={`bg-white rounded-lg shadow-sm border ${isCorrect ? 'border-gray-200' : 'border-red-200'} overflow-hidden`}>
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 flex items-start gap-4"
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

                    <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-xs md:text-sm">
                      <p className="font-semibold text-warning/90 mb-1">해설:</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{q.explanation}</p>
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
