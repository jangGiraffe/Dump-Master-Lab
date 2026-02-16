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
import { shuffleArray, processRawQuestions, authenticateUser } from './utils';
import { APP_CONFIG } from './config';
import { Loader2, AlertCircle } from 'lucide-react';
// Import crypto-js for decryption
import CryptoJS from 'crypto-js';

const SESSION_KEY = 'dump_master_session';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.LOGIN);
  const [userTier, setUserTier] = useState<UserTier | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');
  const [isRetry, setIsRetry] = useState(false);
  const [isBossRaid, setIsBossRaid] = useState(false);
  const [bossRaidWrongIds, setBossRaidWrongIds] = useState<string[]>([]);
  const [userHash, setUserHash] = useState<string>('');
  const [timeTaken, setTimeTaken] = useState<number>(0);

  // Restore session on mount
  React.useEffect(() => {
    const restoreSession = async () => {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (!savedSession) return;

      try {
        const { tier, password, timestamp } = JSON.parse(savedSession);

        // 1. Check if session is expired (12 hours)
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        const isExpired = !timestamp || (Date.now() - timestamp > TWELVE_HOURS);

        if (isExpired) {
          console.log("Session expired, logging out...");
          localStorage.removeItem(SESSION_KEY);
          return;
        }

        // 2. Security Validation: Re-authenticate to prevent localStorage manipulation
        if (tier === 'N' || tier === 'V') {
          if (!password) throw new Error("Missing password for protected tier");
          const verifiedTier = await authenticateUser(password);
          if (verifiedTier !== tier) {
            console.error("Session tier mismatch or invalid password. Potential manipulation detected.");
            localStorage.removeItem(SESSION_KEY);
            setStage(AppStage.LOGIN);
            return;
          }
        }

        const { userId } = JSON.parse(savedSession);

        // 3. If everything is fine, log in
        handleLogin(tier, userId || (password ? 'user_' + password.substring(0, 6) : 'guest'), password);
      } catch (e) {
        console.error("Failed to restore session or validation failed", e);
        localStorage.removeItem(SESSION_KEY);
        setStage(AppStage.LOGIN);
      }
    };

    restoreSession();
  }, []);

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
            // Append version as query param to bust browser cache
            const cacheBustUrl = `${source.url}?v=${APP_CONFIG.VERSION}`;
            const response = await fetch(cacheBustUrl);
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

  const handleLogin = (tier: UserTier, userId: string, inputPassword?: string) => {
    setUserTier(tier);
    setUserHash(userId);
    // Save session to localStorage with timestamp
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      tier,
      userId,
      password: inputPassword,
      timestamp: Date.now()
    }));
    // Pass password for decryption if available
    loadData(tier, inputPassword);

    // Initial sync of history from DB to Local
    historyService.getRecords(userId, true).catch(err => {
      console.error("Failed to perform initial history sync:", err);
    });
  };

  const handleLogout = () => {
    setStage(AppStage.LOGIN);
    setDatasets([]);
    // Clear session from localStorage
    localStorage.removeItem(SESSION_KEY);
  };

  const handleMenuSelect = async (mode: 'quiz' | 'study' | 'history' | 'boss-raid') => {
    if (mode === 'quiz') {
      setIsBossRaid(false);
      setStage(AppStage.SETUP);
    } else if (mode === 'study') {
      setStage(AppStage.STUDY);
    } else if (mode === 'history') {
      setStage(AppStage.HISTORY);
    } else if (mode === 'boss-raid') {
      const records = await historyService.getRecords(userHash);
      const allWrongIds = Array.from(new Set(records.flatMap(r => r.wrongQuestionIds || [])));

      if (allWrongIds.length === 0) {
        alert("정복할 보스가 없습니다! (아직 틀린 문제가 없습니다. 먼저 모의고사를 풀어보세요.)");
        return;
      }

      setBossRaidWrongIds(allWrongIds);
      setIsBossRaid(true);
      setStage(AppStage.SETUP);
    }
  };

  const handleStartBossRaid = async () => {
    const records = await historyService.getRecords(userHash);
    const allWrongIds = Array.from(new Set(records.flatMap(r => r.wrongQuestionIds || [])));

    if (allWrongIds.length === 0) {
      alert("정복할 보스가 없습니다! (아직 틀린 문제가 없습니다. 먼저 모의고사를 풀어보세요.)");
      return;
    }

    // 1. Process all datasets to get all possible questions
    let allAvailableQuestions: Question[] = [];
    datasets.forEach(ds => {
      let originalData: any[] | undefined = undefined;
      if (ds.url && ds.url.endsWith('_KR.json')) {
        const originalUrl = ds.url.replace('_KR.json', '.json');
        const originalDataset = datasets.find(d => d.url === originalUrl);
        if (originalDataset) originalData = originalDataset.data;
      }
      const processed = processRawQuestions(ds.data, ds.id, originalData);
      allAvailableQuestions = [...allAvailableQuestions, ...processed];
    });

    // 2. Filter by wrong IDs
    // Note: The ID structure might be different if processRawQuestions uses Date.now()
    // We should probably change how IDs are generated to be stable.
    // Let's assume for now we match by question text or a more stable ID.
    // Actually, let's fix processRawQuestions ID generation first to be stable.

    // For now, let's try to match by ID
    const bossQuestions = allAvailableQuestions.filter(q => allWrongIds.includes(q.id));

    if (bossQuestions.length === 0) {
      // Fallback: match by question text hash or content if ID is unstable due to Date.now()
      // But for this session, we'll try to use stable IDs.
      alert("데이터가 갱신되어 이전 오답 정보를 찾을 수 없습니다. 새로운 시험부터 기록됩니다.");
      return;
    }

    setQuizQuestions(shuffleArray(bossQuestions));
    setUserAnswers({});
    setIsRetry(true); // Treat as retry for UI purposes
    setConfig({
      questionCount: bossQuestions.length,
      timeLimitMinutes: Math.ceil(bossQuestions.length * 1.5), // 1.5 min per question
      selectedVersions: Array.from(new Set(bossQuestions.map(q => q.sourceVersion || '')))
    });
    setStage(AppStage.QUIZ);
  };

  const handleBackToMenu = () => {
    setStage(AppStage.MENU);
    // Reset quiz state if coming back from result/quiz
    setUserAnswers({});
    setQuizQuestions([]);
    setIsRetry(false);
  };

  const handleStartQuiz = (newConfig: QuizConfig) => {
    setConfig(newConfig);

    // 1. Filter datasets based on selection
    const selectedData = datasets.filter(ds => newConfig.selectedVersions.includes(ds.id));

    // 2. Process raw data into Question objects with IDs
    let allQuestionsPool: Question[] = [];
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

      const processed = processRawQuestions(ds.data, ds.id, originalData);
      allQuestionsPool = [...allQuestionsPool, ...processed];
    });

    // 3. Filter if Boss Raid, then Shuffle and slice
    let finalPool = allQuestionsPool;
    if (isBossRaid) {
      finalPool = allQuestionsPool.filter(q => bossRaidWrongIds.includes(q.id));
    }

    const shuffled = shuffleArray(finalPool);
    // Limit to configured count, but don't exceed available questions
    const finalQuestions = shuffled.slice(0, Math.min(newConfig.questionCount, shuffled.length));

    setQuizQuestions(finalQuestions);
    setUserAnswers({});
    setIsRetry(isBossRaid);
    setStage(AppStage.QUIZ);
  };

  const handleQuizComplete = (answers: Record<string, string>, timeLeft: number) => {
    setUserAnswers(answers);

    if (config) {
      const wrongCount = quizQuestions.filter(q => answers[q.id] !== q.answer).length;
      const wrongQuestions = quizQuestions.filter(q => answers[q.id] !== q.answer);
      const correctCount = quizQuestions.length - wrongCount;
      const score = Math.round((correctCount / quizQuestions.length) * 100);
      const isPass = score >= 72;
      const timeTakenSeconds = (config.timeLimitMinutes * 60) - timeLeft;
      setTimeTaken(timeTakenSeconds);

      historyService.saveRecord({
        totalQuestions: quizQuestions.length,
        correctCount,
        score,
        isPass,
        timeTakenSeconds,
        examNames: Array.from(new Set(quizQuestions.map(q => q.sourceVersion || 'Unknown'))),
        isRetry,
        wrongQuestionIds: wrongQuestions.map(q => q.id)
      }, userHash);
    }

    setStage(AppStage.RESULT);
  };

  const handleRetryWrong = (wrongQuestions: Question[]) => {
    setQuizQuestions(shuffleArray([...wrongQuestions]));
    setUserAnswers({});
    setIsRetry(true);
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
      ? 'h-[100dvh] overflow-hidden flex flex-col'
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
          <History onBack={handleBackToMenu} userId={userHash} />
        )}

        {stage === AppStage.SETUP && (
          <Setup
            datasets={datasets}
            onStart={handleStartQuiz}
            onBack={handleBackToMenu}
            userTier={userTier}
            isBossRaid={isBossRaid}
            wrongQuestionIds={bossRaidWrongIds}
          />
        )}

        {stage === AppStage.QUIZ && config && (
          <Quiz
            questions={quizQuestions}
            timeLimitMinutes={config.timeLimitMinutes}
            onComplete={handleQuizComplete}
            wrongCountMap={(() => {
              const records = historyService.getLocalRecords();
              const map: Record<string, number> = {};
              records.forEach(r => {
                r.wrongQuestionIds?.forEach(id => {
                  map[id] = (map[id] || 0) + 1;
                });
              });
              return map;
            })()}
          />
        )}

        {stage === AppStage.RESULT && (
          <Result
            questions={quizQuestions}
            userAnswers={userAnswers}
            timeTakenSeconds={timeTaken}
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
              <div className="flex items-center space-x-2 text-gray-400 text-[11px] mt-2 pt-2 border-t border-gray-100">
                <span>Version {APP_CONFIG.VERSION}</span>
                <span>•</span>
                <span>Last Updated: {APP_CONFIG.LAST_UPDATED}</span>
              </div>
            </div>
          </footer>
        )
      }
    </div>
  );
};

export default App;