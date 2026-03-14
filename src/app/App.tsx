import React, { useState } from 'react';
import { AppStage, QuizConfig, Question, Dataset, DataSource, UserTier } from '@/shared/model/types';
import { Login } from '@/pages/login';
import { Menu } from '@/pages/menu';
import { Setup } from '@/pages/setup';
import { Study } from '@/pages/study';
import { Quiz } from '@/pages/quiz';
import { Result } from '@/pages/result';
import { History } from '@/pages/history';
import { dataSources } from '@/shared/api/dataService';
import { historyService } from '@/shared/api/historyService';
import { shuffleArray, processRawQuestions, authenticateUser } from '@/shared/lib/utils';
import { APP_CONFIG } from '@/shared/config';
import { Loader2, AlertCircle, Bot } from 'lucide-react';
import { cacheService } from '@/shared/api/cacheService';
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
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Restore session on mount
  React.useEffect(() => {
    const restoreSession = async () => {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (!savedSession) return;

      try {
        const { tier, password, timestamp } = JSON.parse(savedSession);

        // 1. Check if session is expired (1 year)
        const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
        const isExpired = !timestamp || (Date.now() - timestamp > ONE_YEAR);

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

  const fetchDatasets = async (sourceIds: string[]): Promise<Dataset[]> => {
    // 1. Identify what's missing in memory
    const missingInMemory = dataSources.filter(s => 
      sourceIds.includes(s.id) && !datasets.find(d => d.id === s.id)
    );

    if (missingInMemory.length === 0) return datasets;

    const decryptionKey = import.meta.env.VITE_DATA_ENCRYPTION_KEY || '';
    
    // 2. Try to get missing ones from Persistent Cache (IndexedDB)
    const cachedResults = await Promise.all(
      missingInMemory.map(async (source) => {
        const cached = await cacheService.get(source.id);
        if (cached) {
          // Version Check Logic: If server version exists and higher than cached version, force refresh
          const serverVersion = source.version || 1;
          const cachedVersion = cached.version || 1;

          if (serverVersion > cachedVersion) {
            console.log(`[Cache] Update available for ${source.id}: Server(${serverVersion}) > Cache(${cachedVersion})`);
            return null; // Trigger network fetch
          }

          console.log(`[Cache] Loaded persistently: ${source.id} (v${cachedVersion})`);
          return cached;
        }
        return null;
      })
    );

    // 3. For those truly missing or outdated, fetch from network
    const trulyMissingSources = missingInMemory.filter((_, idx) => !cachedResults[idx]);

    const networkLoaded = await Promise.all(
      trulyMissingSources.map(async (source) => {
        try {
          console.log(`[Network] Fetching: ${source.url}`);
          const response = await fetch(source.url);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error(`Expected JSON but got ${contentType}. Body snippet: ${text.substring(0, 100)}`);
            throw new Error(`Invalid content type: ${contentType}. The file might be missing or the path is incorrect.`);
          }

          const rawData = await response.json();

          let data = rawData;
          if (source.isEncrypted && decryptionKey) {
            const ciphertext = rawData.encryptedData || rawData.payload || rawData;
            const bytes = CryptoJS.AES.decrypt(ciphertext, decryptionKey);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            if (!decryptedString) throw new Error("Decryption failed - empty result");
            data = JSON.parse(decryptedString);
          }

          const dataset: Dataset = {
            id: source.id,
            name: source.name,
            data: data,
            examCode: source.examCode,
            url: source.url,
            version: source.version || 1 // Store current version
          };

          // Save to persistent cache
          await cacheService.set(source.id, dataset);
          return dataset;
        } catch (e) {
          console.error(`Failed to load ${source.url}`, e);
          return null;
        }
      })
    );

    // Combine everything
    const newValidDatasets = [
      ...cachedResults.filter((d): d is Dataset => d !== null),
      ...networkLoaded.filter((d): d is Dataset => d !== null)
    ];

    if (newValidDatasets.length > 0) {
      console.log(`[Cache] Successfully resolved ${newValidDatasets.length} datasets.`);
    }

    const updatedDatasets = [...datasets, ...newValidDatasets];
    setDatasets(updatedDatasets);
    return updatedDatasets;
  };

  const handleClearCache = async () => {
    if (window.confirm("모든 저장된 문제 데이터를 삭제하고 서버에서 다시 받으시겠습니까?")) {
      await cacheService.clear();
      setDatasets([]);
      showToast("데이터가 초기화되었습니다. 다음 시험 시작 시 새로 다운로드합니다.");
    }
  };

  const loadData = async (tier: UserTier) => {
    // In lazy loading mode, we just transition to MENU.
    // We can pre-load metadata if needed, but for now we trust dataSources.
    setStage(AppStage.MENU);
  };

  const handleLogin = (tier: UserTier, userId?: string, password?: string) => {
    setUserTier(tier);
    const finalUserId = userId || (password ? 'user_' + password.substring(0, 6) : 'guest');
    setUserHash(finalUserId);

    // Save session
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      tier,
      userId: finalUserId,
      password,
      timestamp: Date.now()
    }));

    loadData(tier);

    // Initial sync
    historyService.syncLocalToCloud(finalUserId).catch(err => {
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
        showToast("정복할 보스가 없습니다! (아직 틀린 문제가 없습니다. 먼저 모의고사를 풀어보세요.)");
        return;
      }

      setBossRaidWrongIds(allWrongIds);
      setIsBossRaid(true);
      setStage(AppStage.SETUP);
    }
  };

  const handleStartBossRaid = async () => {
    setStage(AppStage.LOADING);
    const records = await historyService.getRecords(userHash);
    const allWrongIds = Array.from(new Set(records.flatMap(r => r.wrongQuestionIds || [])));

    if (allWrongIds.length === 0) {
      setStage(AppStage.MENU);
      showToast("정복할 보스가 없습니다! (아직 틀린 문제가 없습니다. 먼저 모의고사를 풀어보세요.)");
      return;
    }

    // Determine which datasets contain these wrong IDs
    // Since we don't know which dataset has which ID without loading, 
    // for Boss Raid we might need to load all available sources for the tier.
    const availableSourceIds = dataSources.filter(s => s.requiredTier?.includes(userTier || 'G')).map(s => s.id);
    const currentDatasets = await fetchDatasets(availableSourceIds);

    // 1. Process all datasets to get all possible questions
    let allAvailableQuestions: Question[] = [];
    currentDatasets.forEach(ds => {
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
    const bossQuestions = allAvailableQuestions.filter(q => allWrongIds.includes(q.id));

    if (bossQuestions.length === 0) {
      showToast("데이터가 갱신되어 이전 오답 정보를 찾을 수 없습니다. 새로운 시험부터 기록됩니다.");
      return;
    }

    // Shuffle options for each question
    const questionsWithShuffledOptions = bossQuestions.map(q => {
      if (!q.options || q.options.length === 0) return q;
      const zipped = q.options.map((opt, i) => ({
        opt,
        orig: q.originalOptions ? q.originalOptions[i] : undefined
      }));
      const shuffledZipped = shuffleArray(zipped);
      return {
        ...q,
        options: shuffledZipped.map(z => z.opt),
        originalOptions: q.originalOptions ? shuffledZipped.map(z => z.orig!) : undefined
      };
    });

    setQuizQuestions(shuffleArray(questionsWithShuffledOptions));
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

  const handleStartQuiz = async (newConfig: QuizConfig) => {
    setStage(AppStage.LOADING);
    setConfig(newConfig);

    // 1. Load selected datasets on demand
    const currentDatasets = await fetchDatasets(newConfig.selectedVersions);

    // 2. Filter datasets based on selection
    const selectedData = currentDatasets.filter(ds => newConfig.selectedVersions.includes(ds.id));

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

    // Shuffle options for each question
    const questionsWithShuffledOptions = finalQuestions.map(q => {
      if (!q.options || q.options.length === 0) return q;

      const zipped = q.options.map((opt, i) => ({
        opt,
        orig: q.originalOptions ? q.originalOptions[i] : undefined
      }));

      const shuffledZipped = shuffleArray(zipped);

      return {
        ...q,
        options: shuffledZipped.map(z => z.opt),
        originalOptions: q.originalOptions ? shuffledZipped.map(z => z.orig!) : undefined
      };
    });

    setQuizQuestions(questionsWithShuffledOptions);
    setUserAnswers({});
    setIsRetry(isBossRaid);
    setStage(AppStage.QUIZ);
  };

  const handleQuizComplete = (answers: Record<string, string>, timeLeft: number, limitCount?: number) => {
    setUserAnswers(answers);

    if (config) {
      // If limitCount is provided, treat the exam as having only that many questions
      const finalQuestions = limitCount ? quizQuestions.slice(0, limitCount) : quizQuestions;

      const wrongQuestions = finalQuestions.filter(q => answers[q.id] !== q.answer);
      const correctCount = finalQuestions.length - wrongQuestions.length;
      const score = Math.round((correctCount / finalQuestions.length) * 100);
      const isPass = score >= 72;
      const timeTakenSeconds = (config.timeLimitMinutes * 60) - timeLeft;
      setTimeTaken(timeTakenSeconds);

      historyService.saveRecord({
        totalQuestions: finalQuestions.length,
        correctCount,
        score,
        isPass,
        timeTakenSeconds,
        examNames: Array.from(new Set(finalQuestions.map(q => q.sourceVersion || 'Unknown'))),
        isRetry,
        wrongQuestionIds: wrongQuestions.map(q => q.id)
      }, userHash);

      // We might want to update the displayed list of questions for the result page too
      if (limitCount) {
        setQuizQuestions(finalQuestions);
      }
    }

    setStage(AppStage.RESULT);
  };

  const handleRetryWrong = (wrongQuestions: Question[]) => {
    // Reshuffle options for each question for the retry session
    const questionsWithReshuffledOptions = wrongQuestions.map(q => {
      if (!q.options || q.options.length === 0) return q;
      const zipped = q.options.map((opt, i) => ({
        opt,
        orig: q.originalOptions ? q.originalOptions[i] : undefined
      }));
      const shuffledZipped = shuffleArray(zipped);
      return {
        ...q,
        options: shuffledZipped.map(z => z.opt),
        originalOptions: q.originalOptions ? shuffledZipped.map(z => z.orig!) : undefined
      };
    });

    setQuizQuestions(shuffleArray(questionsWithReshuffledOptions));
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
            <p className="text-lg font-medium">문제를 다운로드중입니다...</p>
            <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
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
          <Menu onSelectMode={handleMenuSelect} onLogout={handleLogout} userTier={userTier} userId={userHash} />
        )}

        {stage === AppStage.STUDY && (
          <Study onBack={handleBackToMenu} userTier={userTier} showToast={showToast} />
        )}

        {stage === AppStage.SETUP && (
          <Setup
            datasets={datasets}
            onStart={handleStartQuiz}
            onBack={handleBackToMenu}
            userTier={userTier}
            isBossRaid={isBossRaid}
            wrongQuestionIds={bossRaidWrongIds}
            onLoadMoreData={fetchDatasets}
            onClearCache={handleClearCache}
          />
        )}

        {stage === AppStage.HISTORY && (
          <History 
            onBack={handleBackToMenu} 
            userId={userHash} 
            datasets={datasets} 
            onLoadMoreData={fetchDatasets}
          />
        )}

        {stage === AppStage.QUIZ && config && (
          <Quiz
            questions={quizQuestions}
            timeLimitMinutes={config.timeLimitMinutes}
            onComplete={handleQuizComplete}
            examCodes={datasets
              .filter(d => config.selectedVersions.includes(d.id))
              .map(d => d.examCode || 'Uncategorized')
              .filter((v, i, a) => a.indexOf(v) === i)
            }
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
            initialAwsMode={config.isAwsMode}
          />
        )}

        {stage === AppStage.RESULT && (
          <Result
            questions={quizQuestions}
            userAnswers={userAnswers}
            timeTakenSeconds={timeTaken}
            onRestart={handleBackToMenu}
            onRetryWrong={handleRetryWrong}
            examCodes={config ?
              datasets
                .filter(d => config.selectedVersions.includes(d.id))
                .map(d => d.examCode || 'Uncategorized')
                .filter((v, i, a) => a.indexOf(v) === i)
              : []
            }
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

      {/* Global Toast Message */}
      {toastMsg && (
        <div className="fixed top-8 left-0 w-full z-[200] flex justify-center pointer-events-none">
          <div className="animate-slideUp pointer-events-auto bg-indigo-600/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl border border-white/20 flex items-center gap-3">
            <Bot className="w-5 h-5 text-indigo-200" />
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;