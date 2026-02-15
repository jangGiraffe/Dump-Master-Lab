import React, { useState } from 'react';
import { AppStage, QuizConfig, Question, Dataset, DataSource, UserTier } from './types';
import { Login } from './components/Login';
import { Menu } from './components/Menu';
import { Setup } from './components/Setup';
import { Study } from './components/Study';
import { Quiz } from './components/Quiz';
import { Result } from './components/Result';
import { History } from './components/History';
import { dataSources } from './services/dataService';
import { historyService } from './services/historyService';
import { shuffleArray, processRawQuestions } from './utils';
import { Loader2 } from 'lucide-react';
// Import crypto-js for decryption
import CryptoJS from 'crypto-js';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.LOGIN);
  const [userTier, setUserTier] = useState<UserTier | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');

  const loadData = async (tier: UserTier, password?: string) => {
    setStage(AppStage.LOADING);
    setError('');

    // Fallback key if not provided (should be provided for secure tiers)
    // Note: In a real scenario, password should be passed securely. 
    // Here we use the user's password input as the decryption key.
    // Use the environment variable for decryption key
    // This requires the key to be prefixed with VITE_ in .env file
    const decryptionKey = import.meta.env.VITE_DATA_ENCRYPTION_KEY || '';

    try {
      // Filter data sources based on tier
      const availableSources = dataSources.filter(source => {
        // Default to 'N' access if not specified (backward compatibility)
        const reqs = source.requiredTier || ['N'];
        // Check if user's tier is in the allowed list
        return reqs.includes(tier);
      });

      const loadedDatasets: Dataset[] = await Promise.all(
        availableSources.map(async (source: DataSource) => {
          if (source.data) {
            return {
              id: source.id,
              name: source.name,
              url: source.url || '',
              examCode: source.examCode,
              examName: source.examName,
              data: source.data
            };
          }

          if (source.url) {
            const response = await fetch(source.url);
            if (!response.ok) {
              throw new Error(`Failed to load ${source.name}`);
            }
            const data = await response.json();

            // Decryption Logic
            // If data has 'encryptedData' property, we try to decrypt
            if (data.encryptedData) {
              if (!decryptionKey) {
                // Start as Guest or without password -> Access Denied to encrypted content
                // But maybe allow if it's public? 
                // Actually, if it is encrypted, we NEED the key.
                // If no key (Guest login), they shouldn't see encrypted files anyway? 
                // Wait, logic in dataService says Guest only sees 'sample_questions'. 
                // Encrypted files are only for V (and maybe N).
                throw new Error(`Encrypted content requires a valid password/key.`);
              }

              try {
                const bytes = CryptoJS.AES.decrypt(data.encryptedData, decryptionKey);
                const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

                if (!decryptedString) {
                  throw new Error('Decryption Failed');
                }

                const decryptedData = JSON.parse(decryptedString);
                return {
                  id: source.id,
                  name: source.name,
                  url: source.url,
                  examCode: source.examCode,
                  examName: source.examName,
                  data: decryptedData
                };
              } catch (e) {
                console.error("Decryption failed for:", source.name);
                throw new Error(`Failed to decrypt ${source.name}. Invalid password.`);
              }
            }

            // Not encrypted (e.g. sample_questions.json or already plain array)
            return {
              id: source.id,
              name: source.name,
              url: source.url,
              examCode: source.examCode,
              examName: source.examName,
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
      // More specific error message if decryption failed
      if ((err as Error).message.includes('Invalid password')) {
        setError("데이터 복호화 실패: 비밀번호가 올바르지 않거나 데이터가 손상되었습니다.");
      } else {
        setError("문제 데이터를 불러오는 데 실패했습니다. 데이터 설정을 확인해주세요.");
      }
    }
  };

  const handleLogin = (tier: UserTier, inputPassword?: string) => {
    setUserTier(tier);
    // Pass password for decryption if available
    loadData(tier, inputPassword);
  };

  const handleLogout = () => {
    setStage(AppStage.LOGIN);
    setDatasets([]);
  };

  const handleMenuSelect = (mode: 'quiz' | 'study' | 'history') => {
    if (mode === 'quiz') {
      setStage(AppStage.SETUP);
    } else if (mode === 'study') {
      setStage(AppStage.STUDY);
    } else {
      setStage(AppStage.HISTORY);
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
      let originalData: any[] | undefined = undefined;

      // Check if it's a Korean dataset and look for its English counterpart
      if (ds.url && ds.url.endsWith('_KR.json')) {
        const originalUrl = ds.url.replace('_KR.json', '.json');
        const originalDataset = datasets.find(d => d.url === originalUrl);
        if (originalDataset) {
          originalData = originalDataset.data;
        }
      }

      const processed = processRawQuestions(ds.data, ds.name, originalData);
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

  const handleQuizComplete = (answers: Record<string, string>, timeLeft: number) => {
    setUserAnswers(answers);

    if (config) {
      const wrongCount = quizQuestions.filter(q => answers[q.id] !== q.answer).length;
      const correctCount = quizQuestions.length - wrongCount;
      const score = Math.round((correctCount / quizQuestions.length) * 100);
      const isPass = score >= 72;
      const timeTakenSeconds = (config.timeLimitMinutes * 60) - timeLeft;

      historyService.saveRecord({
        totalQuestions: quizQuestions.length,
        correctCount,
        score,
        isPass,
        timeTakenSeconds,
        examNames: Array.from(new Set(quizQuestions.map(q => q.sourceVersion || 'Unknown')))
      });
    }

    setStage(AppStage.RESULT);
  };

  const handleRetryWrong = (wrongQuestions: Question[]) => {
    setQuizQuestions(shuffleArray([...wrongQuestions]));
    setUserAnswers({});
    setStage(AppStage.QUIZ);
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
    <div className={`text-gray-900 font-sans bg-gray-50 ${stage === AppStage.QUIZ || stage === AppStage.STUDY
      ? 'h-screen overflow-hidden flex flex-col'
      : 'min-h-screen flex flex-col'
      }`}>
      <main className={`flex-grow flex flex-col w-full ${stage === AppStage.QUIZ || stage === AppStage.STUDY ? 'overflow-hidden' : ''}`}>
        {stage === AppStage.LOGIN && <Login onLogin={handleLogin} />}

        {stage === AppStage.MENU && (
          <Menu onSelectMode={handleMenuSelect} onLogout={handleLogout} userTier={userTier} />
        )}

        {stage === AppStage.STUDY && (
          <Study onBack={handleBackToMenu} />
        )}

        {stage === AppStage.HISTORY && (
          <History onBack={handleBackToMenu} />
        )}

        {stage === AppStage.SETUP && (
          <Setup
            datasets={datasets}
            onStart={handleStartQuiz}
            onBack={handleBackToMenu}
            userTier={userTier}
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
            onRetryWrong={handleRetryWrong}
          />
        )}
      </main>

      {/* Global Footer - Only shown for non-immersive stages to prevent layout/scroll issues */}
      {
        stage !== AppStage.QUIZ && stage !== AppStage.STUDY && stage !== AppStage.HISTORY && (
          <footer className="py-6 text-center text-sm text-gray-500 bg-gray-50 border-t border-gray-200 shrink-0">
            <div className="flex flex-col items-center justify-center space-y-1">
              <div>
                <span className="font-semibold mr-2">blog :</span>
                <a
                  href="https://janggiraffe.tistory.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline hover:text-blue-800 transition-colors break-all"
                >
                  https://janggiraffe.tistory.com/
                </a>
              </div>
              <div>
                <span className="font-semibold mr-2">github :</span>
                <a
                  href="https://github.com/jangGiraffe/Dump-Master-Lab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline hover:text-blue-800 transition-colors break-all"
                >
                  https://github.com/jangGiraffe/Dump-Master-Lab
                </a>
              </div>
            </div>
          </footer>
        )
      }
    </div >
  );
};

export default App;