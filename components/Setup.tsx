
import React, { useState, useEffect } from 'react';
import { Dataset, QuizConfig } from '../types';
import { Settings, Play, ChevronLeft } from 'lucide-react';

interface SetupProps {
  datasets: Dataset[];
  onStart: (config: QuizConfig) => void;
  onBack: () => void;
}

export const Setup: React.FC<SetupProps> = ({ datasets, onStart, onBack }) => {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  // Default to 65 questions
  const [questionCount, setQuestionCount] = useState<number>(65);
  // Default to 120 minutes
  const [timeLimit, setTimeLimit] = useState<number>(120);
  const [maxQuestions, setMaxQuestions] = useState<number>(0);

  useEffect(() => {
    // Calculate total questions available based on selection
    const total = datasets
      .filter(d => selectedVersions.includes(d.id))
      .reduce((acc, curr) => acc + curr.data.length, 0);
    setMaxQuestions(total);
    
    // Adjust count if it exceeds total
    if (questionCount > total && total > 0) {
      setQuestionCount(total);
      // Auto-adjust time if count changes due to max limit
      setTimeLimit(total * 2);
    }
  }, [selectedVersions, datasets]);

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
    const effectiveMax = maxQuestions > 0 ? maxQuestions : 0;
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

  // Effective max is simply the total available.
  const effectiveMax = maxQuestions;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl">
        <div className="flex items-center mb-6">
          <button 
            onClick={onBack}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            title="메뉴로 돌아가기"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Settings className="w-5 h-5 text-primary mr-2" />
          {/* Reduced title size */}
          <h2 className="text-xl font-semibold text-gray-800">시험 설정</h2>
        </div>

        <div className="space-y-6">
          {/* Version Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">문제 은행 선택</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {datasets.map(ds => (
                <div 
                  key={ds.id}
                  onClick={() => toggleVersion(ds.id)}
                  className={`cursor-pointer p-3 border rounded-lg flex items-center justify-between transition-all ${
                    selectedVersions.includes(ds.id) 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="font-medium text-gray-700 text-sm">{ds.name}</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedVersions.includes(ds.id) ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                  }`}>
                    {selectedVersions.includes(ds.id) && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Question Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                문제 수
                {maxQuestions > 0 && <span className="font-normal text-gray-500 ml-1">(최대: {effectiveMax})</span>}
              </label>
              <input 
                type="number" 
                min="1" 
                max={effectiveMax > 0 ? effectiveMax : undefined}
                value={questionCount}
                onChange={handleQuestionCountChange}
                disabled={maxQuestions === 0}
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-primary focus:border-primary placeholder-gray-400 text-sm"
              />
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
              className={`w-full flex items-center justify-center py-2.5 px-4 rounded-lg font-semibold text-white transition-all text-sm ${
                selectedVersions.length === 0 || questionCount < 1
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-primary hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              <Play className="w-4 h-4 mr-2" />
              시험 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
