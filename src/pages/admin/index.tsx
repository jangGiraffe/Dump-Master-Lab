import React, { useEffect, useState } from 'react';
import { Users, Clock, CheckCircle, BarChart2, LogOut, RefreshCw, Trophy, Target, AlertTriangle } from 'lucide-react';
import { historyService } from '@/shared/api/historyService';
import { dataSources } from '@/shared/api/dataService';
import { HistoryRecord } from '@/shared/model/types';
import { formatTime } from '@/shared/lib/utils';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchRecords = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await historyService.getAllRecordsForAdmin();
      setRecords(data);
    } catch (e: any) {
      setErrorMsg(e.message || String(e));
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const examRecords = records.filter(r => r.mode !== 'study');

  const totalUsers = new Set(records.map(r => r.userId).filter(Boolean)).size;
  const totalTimeSeconds = records.reduce((acc, cur) => acc + (cur.timeTakenSeconds || 0), 0);
  const totalQuestions = examRecords.reduce((acc, cur) => acc + (cur.totalQuestions || 0), 0);
  const totalCorrect = examRecords.reduce((acc, cur) => acc + (cur.correctCount || 0), 0);
  const totalSessions = examRecords.length;
  
  const averageScore = totalSessions > 0 
    ? (examRecords.reduce((acc, cur) => acc + (cur.score || 0), 0) / totalSessions).toFixed(1)
    : 0;
    
  const passCount = examRecords.filter(r => r.isPass).length;
  const passRate = totalSessions > 0 ? ((passCount / totalSessions) * 100).toFixed(1) : 0;

  // formatTime Helper for long times
  const formatTotalTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}시간 ${mins}분`;
    return `${mins}분`;
  };

  // Detailed Analysis Data
  const examCounts = examRecords.reduce((acc, cur) => {
    (cur.examNames || []).forEach(name => {
      acc[name] = (acc[name] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  const topExams = Object.entries(examCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const userCounts = examRecords.reduce((acc, cur) => {
    if (cur.userId) {
      acc[cur.userId] = (acc[cur.userId] || 0) + (cur.totalQuestions || 0);
    }
    return acc;
  }, {} as Record<string, number>);
  const topUsers = Object.entries(userCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const wrongQuestionCounts = examRecords.reduce((acc, cur) => {
    (cur.wrongQuestionIds || []).forEach(id => {
      acc[id] = (acc[id] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  const topWrongQuestions = Object.entries(wrongQuestionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const maskUserId = (id: string) => {
    if (!id || id === 'anonymous') return '익명사용자';
    if (id.startsWith('user_')) {
      return id.substring(0, 7) + '***'; // user_12***
    }
    return id.substring(0, 3) + '***';
  };

  const getExamDisplayName = (examId: string) => {
    const source = dataSources.find(s => s.id === examId);
    return source ? source.name : examId;
  };

  return (
    <div className="flex flex-col flex-grow bg-gray-50 dark:bg-slate-900 transition-colors duration-300 min-h-screen">
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-lg">
              <BarChart2 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">관리자 대시보드</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchRecords}
              className="p-2 text-gray-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
              title="새로고침"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <ThemeToggle />
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-danger hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{errorMsg}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-slate-400">총 사용자 수</h2>
                </div>
                <div className="mt-auto">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{totalUsers}</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">명</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-slate-400">총 사용 시간</h2>
                </div>
                <div className="mt-auto">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatTotalTime(totalTimeSeconds)}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-slate-400">총 풀이 문제 수</h2>
                </div>
                <div className="mt-auto">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{totalQuestions.toLocaleString()}</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">문제</span>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">정답: {totalCorrect.toLocaleString()}개</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
                    <BarChart2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-slate-400">학습 세션 통계</h2>
                </div>
                <div className="mt-auto">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-gray-500 dark:text-slate-400">완료 시험</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{totalSessions}회</span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-gray-500 dark:text-slate-400">평균 점수</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{averageScore}점</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-gray-500 dark:text-slate-400">합격률</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{passRate}%</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Detailed Analysis Section */}
            {records.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                
                {/* Top Users */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-700 pb-4">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">우수 사용자 Top 5</h3>
                  </div>
                  <ul className="space-y-4">
                    {topUsers.map(([id, count], idx) => (
                      <li key={id} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : idx === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{maskUserId(id)}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{count.toLocaleString()} <span className="text-xs text-gray-500 font-normal">문제</span></span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Popular Exams */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-700 pb-4">
                    <Target className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">인기 모의고사 Top 5</h3>
                  </div>
                  <ul className="space-y-4">
                    {topExams.map(([name, count], idx) => (
                      <li key={name} className="flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate pr-2 max-w-[200px]" title={getExamDisplayName(name)}>{getExamDisplayName(name)}</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{count} <span className="text-xs text-gray-500 font-normal">회</span></span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (count / topExams[0][1]) * 100)}%` }}></div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hardest Questions */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-700 pb-4">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">가장 많이 틀린 문제 Top 5</h3>
                  </div>
                  <ul className="space-y-4">
                    {topWrongQuestions.map(([qId, count], idx) => {
                      // Extract exam code from question ID (e.g., v1-15 -> v1)
                      // Handle exam names with hyphens (e.g., MLA-C01-v1-15)
                      const lastDashIndex = qId.lastIndexOf('-');
                      const examId = lastDashIndex !== -1 ? qId.substring(0, lastDashIndex) : qId;
                      const indexStr = lastDashIndex !== -1 ? qId.substring(lastDashIndex + 1) : '0';
                      const qNum = parseInt(indexStr) + 1;
                      
                      return (
                        <li key={qId} className="flex justify-between items-center bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-slate-400">{getExamDisplayName(examId)}</span>
                            <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{isNaN(qNum) ? '알 수 없음' : `${qNum}번 문제`}</span>
                          </div>
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <span className="font-bold text-lg">{count}</span>
                            <span className="text-xs">회 오답</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {topWrongQuestions.length === 0 && (
                    <div className="text-center text-sm text-gray-500 py-4">틀린 문제가 없습니다!</div>
                  )}
                </div>

              </div>
            )}


            {records.length === 0 && !isLoading && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">데이터가 없습니다</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">아직 시험을 완료한 사용자가 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
