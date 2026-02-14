import React, { useState } from 'react';
import { AppStage, QuizConfig, Question, Dataset, DataSource } from './types';
import { Login } from './components/Login';
import { Menu } from './components/Menu';
import { Setup } from './components/Setup';
import { Study } from './components/Study';
import { Quiz } from './components/Quiz';
import { Result } from './components/Result';
import { dataSources } from './services/dataService';
import { shuffleArray, processRawQuestions } from './utils';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.LOGIN);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');

  const loadData = async () => {
    setStage(AppStage.LOADING);
    setError('');
    try {
      // Simulate loading delay for better UX or handle actual async if needed
      // With direct imports, data is already available
      const loadedDatasets: Dataset[] = await Promise.all(
        dataSources.map(async (source: DataSource) => {
          if (source.data) {
            return {
              id: source.id,
              name: source.name,
              url: source.url || '',
              data: source.data
            };
          }
          
          // Fallback for URL based sources (if any)
          if (source.url) {
            const response = await fetch(source.url);
            if (!response.ok) {
              throw new Error(`Failed to load ${source.name}`);
            }
            const data = await response.json();
            return {
              id: source.id,
              name: source.name,
              url: source.url,
              data: data
            };
          }
          
          throw new Error(`Invalid data source: ${source.name}`);
        })
      );
      
      setDatasets(loadedDatasets);
      setStage(AppStage.MENU);
    } catch (err) {
      console.error("Failed to load question banks:", err);
      setError("문제 데이터를 불러오는 데 실패했습니다. 데이터 설정을 확인해주세요.");
    }
  };

  const handleLogin = () => {
    loadData();
  };

  const handleLogout = () => {
    setStage(AppStage.LOGIN);
    setDatasets([]);
  };

  const handleMenuSelect = (mode: 'quiz' | 'study') => {
    if (mode === 'quiz') {
      setStage(AppStage.SETUP);
    } else {
      setStage(AppStage.STUDY);
    }
  };

  const handleBackToMenu = () => {
    setStage(AppStage.MENU);
    // Reset quiz state if coming back from result/quiz
    setUserAnswers({});
    setQuizQuestions([]);
  };

  const handleStartQuiz = (newConfig: QuizConfig) => {
    setConfig(newConfig);
    
    // 1. Filter datasets based on selection
    const selectedData = datasets.filter(ds => newConfig.selectedVersions.includes(ds.id));
    
    // 2. Process raw data into Question objects with IDs
    let allQuestions: Question[] = [];
    selectedData.forEach(ds => {
      const processed = processRawQuestions(ds.data, ds.name);
      allQuestions = [...allQuestions, ...processed];
    });

    // 3. Shuffle and slice
    const shuffled = shuffleArray(allQuestions);
    // Limit to configured count, but don't exceed available questions
    const finalQuestions = shuffled.slice(0, Math.min(newConfig.questionCount, shuffled.length));

    setQuizQuestions(finalQuestions);
    setUserAnswers({});
    setStage(AppStage.QUIZ);
  };

  const handleQuizComplete = (answers: Record<string, string>) => {
    setUserAnswers(answers);
    setStage(AppStage.RESULT);
  };

  if (stage === AppStage.LOADING) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800">
        {error ? (
           <div className="text-danger p-4 bg-red-50 border border-red-200 rounded-lg max-w-md text-center">
             <h3 className="font-bold text-lg mb-2">오류</h3>
             <p className="mb-4">{error}</p>
             <button 
               onClick={() => setStage(AppStage.LOGIN)}
               className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
             >
               로그인 화면으로 돌아가기
             </button>
           </div>
        ) : (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-lg font-medium">시험 데이터 로딩 중...</p>
            <p className="text-sm text-gray-500 mt-2">문제 은행 준비 중</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-900 font-sans">
      {stage === AppStage.LOGIN && <Login onLogin={handleLogin} />}
      
      {stage === AppStage.MENU && (
        <Menu onSelectMode={handleMenuSelect} onLogout={handleLogout} />
      )}

      {stage === AppStage.STUDY && (
        <Study onBack={handleBackToMenu} />
      )}
      
      {stage === AppStage.SETUP && (
        <Setup 
          datasets={datasets} 
          onStart={handleStartQuiz}
          onBack={handleBackToMenu}
        />
      )}

      {stage === AppStage.QUIZ && config && (
        <Quiz 
          questions={quizQuestions}
          timeLimitMinutes={config.timeLimitMinutes}
          onComplete={handleQuizComplete}
        />
      )}

      {stage === AppStage.RESULT && (
        <Result 
          questions={quizQuestions}
          userAnswers={userAnswers}
          onRestart={handleBackToMenu}
        />
      )}
    </div>
  );
};

export default App;