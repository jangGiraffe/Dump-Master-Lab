import React, { useState, useEffect } from 'react';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { HistoryRecord, Dataset, Question } from '@/shared/model/types';
import { historyService } from '@/shared/api/historyService';
import { examService } from '@/shared/api/examService';
import { dataSources } from '@/shared/api/dataService';
import { formatTime, ResultCharacter, processRawQuestions } from '@/shared/lib/utils';
import { ChevronLeft, ChevronDown, Trash2, Calendar, Award, Clock, BarChart2, BarChart3, BookOpen, Target, Cloud, RefreshCw, Eye, X, AlertCircle, Copy, Bot } from 'lucide-react';

interface HistoryProps {
    onBack: () => void;
    userId?: string;
    datasets: Dataset[];
}

const StatTooltip: React.FC<{ children: React.ReactNode; text: string; className?: string; align?: 'left' | 'center' | 'right' }> = ({ children, text, className, align = 'center' }) => (
    <div className={`relative group/stat inline-flex flex-col items-center ${className || ''}`}>
        {children}
        <div className={`opacity-0 group-hover/stat:opacity-100 transition-opacity duration-200 absolute bottom-full mb-2 pointer-events-none z-50 w-max max-w-[200px] whitespace-normal ${align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'left' ? 'left-0' : 'right-0'}`}>
            <div className="bg-gray-900/95 dark:bg-slate-800/95 backdrop-blur-sm text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl border border-gray-700/50 dark:border-slate-600/50 font-bold px-3 py-1.5 rounded-md text-center">
                {text}
            </div>
            <div className={`absolute top-full -mt-px border-4 border-transparent border-t-gray-900/95 dark:border-t-slate-800/95 ${align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'left' ? 'left-4' : 'right-4'}`}></div>
        </div>
    </div>
);

const DashboardCard: React.FC<{ title: string; subtitle?: string; value: string | number; unit?: string; icon: React.ReactNode; color: string; delay?: string; tooltip?: string }> = ({ title, subtitle, value, unit, icon, color, delay, tooltip }) => {
    const content = (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 animate-slideIn w-full h-full ${delay || ''}`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`}>
                    {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${color.replace('bg-', 'text-')}` })}
                </div>
                {subtitle && (
                    <span className="text-[10px] font-bold text-gray-300 dark:text-slate-500 uppercase tracking-widest">{subtitle}</span>
                )}
            </div>
            <div>
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 mb-1 uppercase tracking-tight">{title}</p>
                <div className="flex items-baseline gap-1 flex-wrap">
                    <span className={`${String(value).length > 6 ? 'text-xl' : 'text-2xl'} font-black text-gray-800 dark:text-white tabular-nums leading-tight`}>{value}</span>
                    {unit && <span className="text-sm font-bold text-gray-400 dark:text-slate-500">{unit}</span>}
                </div>
            </div>
        </div>
    );

    return tooltip ? <StatTooltip text={tooltip} className="w-full h-full flex-1">{content}</StatTooltip> : content;
};

const ExamPerformanceCard: React.FC<{
    name: string;
    avgScore: number;
    totalSolved: number;
    passRate: number;
    attempts: number;
}> = ({ name, avgScore, totalSolved, passRate, attempts }) => (
    <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 border border-gray-100 dark:border-slate-700 transition-all hover:bg-white dark:hover:bg-slate-700 shadow-sm hover:shadow-md">
        <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-[12px] font-black text-gray-700 dark:text-gray-200 truncate mb-1" title={name}>{name}</h4>
                <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tighter">{attempts}회 응시</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-slate-600" />
                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tighter">{totalSolved}문제</span>
                </div>
            </div>
            <StatTooltip text="정답률: 맞힌 문제 / 전체 문제" align="right">
                <div className={`text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${avgScore >= 72 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                    {avgScore}%
                </div>
            </StatTooltip>
        </div>
        <div className="flex items-center justify-between gap-4">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ${avgScore >= 72 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${avgScore}%` }}
                />
            </div>
            <StatTooltip text="합격률: 합격 횟수 / 총 응시 횟수" align="right">
                <div className="flex items-center gap-1 shrink-0">
                    <Target className="w-2.5 h-2.5 text-rose-500" />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">
                        {passRate}%
                    </span>
                </div>
            </StatTooltip>
        </div>
    </div>
);

const ExamGroupCard: React.FC<{
    delay?: string;
    onDeleteGroup?: (ids: string[], name: string) => void;
}> = ({ groupName, total, childrenStats, delay, onDeleteGroup }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = childrenStats.length > 0;
    const recordIds = total.recordIds;

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 animate-slideIn transition-all ${isExpanded ? '' : 'overflow-hidden'} ${delay || ''}`}>
            <div
                className={`bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-800/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group ${hasChildren ? 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-slate-700/50 transition-colors' : ''}`}
                onClick={() => hasChildren && setIsExpanded(!isExpanded)}
            >
                <div className="flex-1">
                    <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2 mb-1">
                        <BookOpen className="w-5 h-5 text-indigo-500" />
                        {groupName}
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold border border-indigo-100 dark:border-indigo-800/50">Total</span>
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
                        <span>{total.attempts}회 응시</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                        <span>{total.totalSolved}문제</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 md:w-auto w-full justify-between md:justify-end">
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-900/50 p-2.5 md:p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                        <StatTooltip text="정답률: 맞힌 문제 / 전체 문제" align="center">
                            <div className="flex flex-col items-center px-2">
                                <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-0.5">정답률</span>
                                <span className={`text-sm md:text-base font-black ${total.avgScore >= 72 ? 'text-emerald-500' : 'text-rose-500'}`}>{total.avgScore}%</span>
                            </div>
                        </StatTooltip>
                        <div className="w-px h-8 bg-gray-100 dark:bg-slate-700"></div>
                        <StatTooltip text="합격률: 합격 횟수 / 총 응시 횟수" align="right">
                            <div className="flex flex-col items-center px-2">
                                <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-0.5">합격률</span>
                                <span className="text-sm md:text-base font-black text-gray-700 dark:text-gray-300">{total.passRate}%</span>
                            </div>
                        </StatTooltip>
                    </div>
                    {hasChildren && (
                        <div className="p-2 shrink-0 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors group-hover:bg-gray-200 dark:group-hover:bg-slate-600">
                            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                    )}
                    {onDeleteGroup && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteGroup(recordIds, groupName);
                            }}
                            className="p-2 shrink-0 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/30 text-gray-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                            title={`[${groupName}] 모든 기록 삭제`}
                        >
                            <Trash2 className="w-4 h-4 md:w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div
                className={`transition-all duration-300 ease-in-out border-gray-100 dark:border-slate-700/50 ${isExpanded ? 'max-h-[2000px] border-t opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
            >
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-gray-50/50 dark:bg-slate-800/50">
                    {childrenStats.map((child, idx) => (
                        <ExamPerformanceCard key={idx} {...child} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const ActivityHeatmap: React.FC<{ records: HistoryRecord[] }> = ({ records }) => {
    // Generate last 12 weeks of dates
    const weeks = 12;
    const days = weeks * 7;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));

    // Group records by date string (YYYY-MM-DD)
    const activityMap: Record<string, number> = {};
    records.forEach(r => {
        const d = new Date(r.timestamp);
        const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        activityMap[dateStr] = (activityMap[dateStr] || 0) + r.totalQuestions;
    });

    const heatmapDays = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        const count = activityMap[dateStr] || 0;
        heatmapDays.push({ date: dateStr, count });
    }

    const getColor = (count: number) => {
        if (count === 0) return 'bg-gray-100 dark:bg-slate-700';
        if (count < 65) return 'bg-emerald-200 dark:bg-emerald-900';
        if (count < 130) return 'bg-emerald-400 dark:bg-emerald-700';
        if (count < 260) return 'bg-emerald-600 dark:bg-emerald-500';
        return 'bg-emerald-800 dark:bg-emerald-300';
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-slate-700 mb-8 animate-slideIn">
            <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                <Calendar className="w-3 h-3 mr-2" />
                학습 잔디 (최근 12주) <span className="ml-1 text-base">🌵</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
                {heatmapDays.map((day, idx) => (
                    <div
                        key={idx}
                        className={`relative group w-3.5 h-3.5 rounded-[2px] ${getColor(day.count)} transition-all hover:ring-2 hover:ring-emerald-300 cursor-help`}
                    >
                        {/* Custom Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none z-50 w-max">
                            <div className="bg-gray-900/95 dark:bg-slate-800/95 backdrop-blur-sm text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl border border-gray-700/50 dark:border-slate-600/50 flex flex-col items-center gap-0.5">
                                <span className="text-gray-400 font-medium">{day.date}</span>
                                <span className="font-bold text-emerald-400 text-xs">{day.count}문제 해결</span>
                            </div>
                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900/95 dark:border-t-slate-800/95"></div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Less</span>
                <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-gray-100 dark:bg-slate-700" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-200 dark:bg-emerald-900" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-400 dark:bg-emerald-700" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-600 dark:bg-emerald-500" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-800 dark:bg-emerald-300" />
                </div>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tighter">More</span>
            </div>
        </div>
    );
};

export const History: React.FC<HistoryProps> = ({ onBack, userId, datasets }) => {
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<HistoryRecord | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedBulk, setCopiedBulk] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    // 퀴즈 문제 매핑 (상세 보기를 위해)
    const allQuestionsMap = React.useMemo(() => {
        if (!datasets) return {};
        const map: Record<string, Question> = {};
        datasets.forEach(ds => {
            let originalData: any[] | undefined = undefined;
            if (ds.url && ds.url.endsWith('_KR.json')) {
                const originalUrl = ds.url.replace('_KR.json', '.json');
                const originalDataset = datasets.find(d => d.url === originalUrl);
                if (originalDataset) originalData = originalDataset.data;
            }
            const processed = processRawQuestions(ds.data, ds.id, originalData);
            processed.forEach(q => {
                map[q.id] = q;
            });
        });
        return map;
    }, [datasets]);

    const loadRecords = async () => {
        setIsLoading(true);
        // Force fetch from cloud/storage and log for debugging
        const data = await historyService.getRecords(userId, true);

        // Ensure strictly sorted by timestamp (newest first)
        data.sort((a, b) => b.timestamp - a.timestamp);

        setRecords(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadRecords();
    }, [userId]);

    const formatStudyTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}시간 ${minutes}분 `;
        }
        if (minutes > 0) {
            return `${minutes}분 ${seconds}초`;
        }
        return `${seconds}초`;
    };

    // Helper function to resolve examName/examCode from dataSources ids
    const resolveExamGroupId = (recordIds: string[]): string => {
        const matchingSources = recordIds
            .map(id => dataSources.find(ds => ds.id === id))
            .filter(Boolean);

        if (matchingSources.length === 0) return '미분류';

        // Group by examCode (or examName if examCode missing)
        const codes = Array.from(new Set(matchingSources.map(s => s?.examCode || '미분류')));
        return codes.join(' / ');
    };

    const getExamStats = (recordList: HistoryRecord[]) => {
        const map: Record<string, {
            groupName: string;
            total: { totalQ: number; correctC: number; attempts: number; passC: number, recordIds: string[] },
            sub: Record<string, { totalQ: number; correctC: number; attempts: number; passC: number }>,
            lastTimestamp: number;
        }> = {};

        recordList.forEach(r => {
            const sources = r.examNames.map(id => dataSources.find(ds => ds.id === id));

            // 그룹 명칭 (examCode 로 통일)
            const groupCode = sources.every(s => !s) ? '미분류' : Array.from(new Set(sources.filter(Boolean).map(s => s?.examCode || '미분류'))).join(' / ');

            if (!map[groupCode]) {
                map[groupCode] = { groupName: groupCode, total: { totalQ: 0, correctC: 0, attempts: 0, passC: 0, recordIds: [] }, sub: {}, lastTimestamp: 0 };
            }

            // 그룹 전체(Total) 통계 누적
            map[groupCode].total.recordIds.push(r.id);
            map[groupCode].total.totalQ += r.totalQuestions;
            map[groupCode].total.correctC += r.correctCount;
            map[groupCode].total.attempts += 1;
            if (r.isPass) map[groupCode].total.passC += 1;
            if (r.timestamp > map[groupCode].lastTimestamp) map[groupCode].lastTimestamp = r.timestamp;

            // 개별 소스(subName) 통계 분리 누적
            // 기록 안에 여러 개의 시험이 섞여 있었다면, 각 버전에 대해 비례적으로 할당하여 
            // 전체 통계의 합이 실제 문제 수와 일치하도록 보정함
            const subCount = r.examNames.length;
            r.examNames.forEach(id => {
                const sourceInfo = dataSources.find(ds => ds.id === id);
                const subName = sourceInfo?.name || (id === 'Unknown' ? '알 수 없는 데이터' : id);

                if (!map[groupCode].sub[subName]) {
                    map[groupCode].sub[subName] = { totalQ: 0, correctC: 0, attempts: 0, passC: 0 };
                }
                // 비례적 가중치 적용 (N개 버전을 함께 응시한 경우 1/N씩 배분)
                map[groupCode].sub[subName].totalQ += (r.totalQuestions / subCount);
                map[groupCode].sub[subName].correctC += (r.correctCount / subCount);
                map[groupCode].sub[subName].attempts += 1;
                if (r.isPass) map[groupCode].sub[subName].passC += 1;
            });
        });

        return Object.values(map).map(group => {
            const totalToDistribute = Math.round(group.total.totalQ);

            // 하위 통계 생성
            let rawChildren = Object.entries(group.sub).map(([name, stats]) => ({
                name,
                avgScore: stats.totalQ > 0 ? Math.round((stats.correctC / stats.totalQ) * 100) : 0,
                totalSolvedFloat: stats.totalQ,
                totalSolved: Math.round(stats.totalQ),
                passRate: stats.attempts > 0 ? Math.round((stats.passC / stats.attempts) * 100) : 0,
                attempts: stats.attempts,
            }));

            // 반올림 오차 보정 (합계가 전체와 일치하도록)
            const currentSum = rawChildren.reduce((acc, c) => acc + c.totalSolved, 0);
            const diff = totalToDistribute - currentSum;

            if (diff !== 0 && rawChildren.length > 0) {
                // 문제 수가 가장 많은 항목에 오차 배분 (가장 티가 안 나는 곳)
                const sortedByCount = [...rawChildren].sort((a, b) => b.totalSolvedFloat - a.totalSolvedFloat);
                const targetName = sortedByCount[0].name;
                rawChildren = rawChildren.map(c =>
                    c.name === targetName ? { ...c, totalSolved: c.totalSolved + diff } : c
                );
            }

            return {
                groupName: group.groupName,
                total: {
                    avgScore: group.total.totalQ > 0 ? Math.round((group.total.correctC / group.total.totalQ) * 100) : 0,
                    totalSolved: totalToDistribute,
                    passRate: group.total.attempts > 0 ? Math.round((group.total.passC / group.total.attempts) * 100) : 0,
                    attempts: group.total.attempts,
                    recordIds: group.total.recordIds
                },
                childrenStats: rawChildren.sort((a, b) => b.attempts - a.attempts),
                lastTimestamp: group.lastTimestamp
            };
        }).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    };

    // 오늘 푼 데이터 계산 (정답 수 / 전체 문제 수)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayRecords = records.filter(r => r.timestamp >= startOfToday);
    const todaySolvedCount = todayRecords.reduce((acc, r) => acc + r.totalQuestions, 0);
    const todayCorrectCount = todayRecords.reduce((acc, r) => acc + r.correctCount, 0);
    const todayTimeSpent = todayRecords.reduce((acc, r) => acc + (r.timeTakenSeconds || 0), 0);

    // 오늘 정답률
    const todayAccuracy = todaySolvedCount > 0
        ? Math.round((todayCorrectCount / todaySolvedCount) * 100)
        : 0;

    // 오늘 합격률
    const todayPassRate = todayRecords.length > 0
        ? Math.round((todayRecords.filter(r => r.isPass).length / todayRecords.length) * 100)
        : 0;

    const todayExamStats = getExamStats(todayRecords);

    // 전체 기록 통계 (All Time Stats)
    const allAvgScore = records.length > 0
        ? Math.round(records.reduce((acc, r) => acc + r.score, 0) / records.length)
        : 0;

    const allTotalSolved = records.reduce((acc, r) => acc + r.totalQuestions, 0);
    const allTotalTimeSpent = records.reduce((acc, r) => acc + (r.timeTakenSeconds || 0), 0);

    const allPassRate = records.length > 0
        ? Math.round((records.filter(r => r.isPass).length / records.length) * 100)
        : 0;

    const allExamStats = getExamStats(records);

    // 전체 기록조차 오늘 기록과 동일한 경우 중복 표시 방지
    const isAllSameAsToday = records.length === todayRecords.length;

    const displayTitle = "전체 기간 성적 (All Time)";
    const displayAvgScore = allAvgScore;
    const displayTotalSolved = allTotalSolved;
    const displayTotalTime = allTotalTimeSpent;
    const displayPassRate = allPassRate;
    const displayExamStats = allExamStats;

    const previousRecords = records.filter(r => r.timestamp < startOfToday);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('이 기록을 삭제하시겠습니까?')) {
            try {
                await historyService.deleteRecord(id);
                showToast('기록이 삭제되었습니다.');
                await loadRecords();
            } catch (err) {
                console.error('Failed to delete record:', err);
                showToast('기록 삭제에 실패했습니다. 서버 연결을 확인해주세요.');
            }
        }
    };

    const handleDeleteGroup = async (ids: string[], name: string) => {
        if (window.confirm(`[${name}]의 모든 기록(${ids.length}개)을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            try {
                setIsLoading(true);
                await historyService.deleteRecords(ids);
                showToast(`[${name}]의 모든 기록이 삭제되었습니다.`);
                await loadRecords();
            } catch (err) {
                console.error('Failed to delete group:', err);
                showToast('기록 삭제에 실패했습니다. 서버 연결을 확인해주세요.');
                setIsLoading(false);
            }
        }
    };

    const handleSync = async () => {
        if (!userId) {
            showToast('로그인 후 이용 가능합니다.');
            return;
        }

        const localRecords = historyService.getLocalRecords();
        if (localRecords.length === 0) {
            showToast('동기화할 로컬 데이터가 없습니다.');
            return;
        }

        if (window.confirm('로컬에 저장된 이력을 서버로 동기화하시겠습니까?')) {
            setIsLoading(true);
            try {
                const count = await historyService.syncLocalToCloud(userId);
                showToast(`${count}개의 새로운 기록이 서버로 동기화되었습니다.`);
                await loadRecords();
            } catch (e) {
                console.error(e);
                showToast('동기화 중 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col flex-grow bg-gray-50 dark:bg-slate-900 p-4 md:p-8 overflow-y-auto transition-colors duration-300">
            <div className="max-w-4xl mx-auto w-full">

                <div className="flex items-center mb-6">
                    <button
                        onClick={onBack}
                        className="mr-4 p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors text-gray-600 dark:text-slate-300 shadow-sm border dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        나의 기록
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-black uppercase tracking-tighter ${historyService.getStorageMode() === 'CLOUD' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-700'}`}>
                            {historyService.getStorageMode()}
                        </span>
                    </h2>

                    <div className="ml-auto flex items-center gap-2">
                        {historyService.getStorageMode() === 'CLOUD' && (
                            <button
                                onClick={handleSync}
                                disabled={isLoading || !userId}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-bold border border-indigo-100 dark:border-indigo-800 disabled:opacity-50"
                                title="로컬 데이터를 서버와 동기화합니다"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">서버로 동기화</span>
                            </button>
                        )}
                        <ThemeToggle />
                    </div>
                </div>

                {
                    isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 animate-fadeIn">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="mt-6 text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">
                                데이터 동기화 중...
                            </p>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-16 text-center animate-slideIn">
                            <div className="inline-flex p-5 bg-gray-50 dark:bg-slate-700 rounded-2xl mb-6">
                                <BarChart2 className="w-12 h-12 text-gray-300 dark:text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">기록이 없습니다</h3>
                            <p className="text-gray-500 dark:text-slate-400 mb-8 max-w-xs mx-auto">아직 응시한 시험 기록이 없습니다. 지금 바로 첫 시험에 도전해보세요!</p>
                            <button
                                onClick={onBack}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                            >
                                <BookOpen className="w-5 h-5" />
                                시험 보러 가기
                            </button>
                        </div>
                    ) : (
                        <div className="animate-fadeIn">
                            <ActivityHeatmap records={records} />

                            {/* 전체 기록이 오늘 기록과 다를 때만 표시 (중복 방지) */}
                            {!isAllSameAsToday && (
                                <div className="mb-10">
                                    <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                                        <Clock className="w-3 h-3 mr-2" />
                                        {displayTitle}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <DashboardCard
                                            title="평균 정답률"
                                            value={displayAvgScore}
                                            unit="%"
                                            icon={<BarChart3 />}
                                            color="bg-blue-600"
                                            delay="animate-slideInStagger1"
                                            tooltip="전체 문제 중 맞힌 문제의 비율"
                                        />
                                        <DashboardCard
                                            title="누적 문제 수"
                                            value={displayTotalSolved}
                                            unit="개"
                                            icon={<BookOpen />}
                                            color="bg-indigo-600"
                                            delay="animate-slideInStagger2"
                                            tooltip="지금까지 풀었던 모든 문제의 총합"
                                        />
                                        <DashboardCard
                                            title="누적 공부 시간"
                                            value={formatStudyTime(displayTotalTime)}
                                            icon={<Clock />}
                                            color="bg-amber-600"
                                            delay="animate-slideInStagger3"
                                            tooltip="시험 응시 과정에서 소요된 총 시간"
                                        />
                                        <DashboardCard
                                            title="합격률"
                                            value={displayPassRate}
                                            unit="%"
                                            icon={<Target />}
                                            color="bg-rose-600"
                                            delay="animate-slideInStagger4"
                                            tooltip="전체 응시 중 합격 횟수의 비율"
                                        />
                                    </div>

                                    {displayExamStats.length > 0 && (
                                        <div className="space-y-4 animate-fadeIn">
                                            {displayExamStats.map((group, idx) => (
                                                <ExamGroupCard
                                                    key={group.groupName}
                                                    {...group}
                                                    delay={`animate-slideInStagger${(idx % 3) + 1}`}
                                                    onDeleteGroup={handleDeleteGroup}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mb-10">
                                <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                                    <Calendar className="w-3 h-3 mr-2" />
                                    오늘의 성적 (Today)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <DashboardCard
                                        title="오늘 정답률"
                                        value={todayAccuracy}
                                        unit="%"
                                        icon={<Award />}
                                        color="bg-emerald-600"
                                        delay="animate-slideInStagger1"
                                        tooltip="오늘 푼 문제 중 맞힌 문제의 비율"
                                    />
                                    <DashboardCard
                                        title="오늘 푼 문제수"
                                        value={todaySolvedCount}
                                        unit="개"
                                        icon={<Calendar />}
                                        color="bg-teal-600"
                                        delay="animate-slideInStagger2"
                                        tooltip="오늘 하루 동안 해결한 총 문제 수"
                                    />
                                    <DashboardCard
                                        title="오늘 공부 시간"
                                        value={formatStudyTime(todayTimeSpent)}
                                        icon={<Clock />}
                                        color="bg-cyan-600"
                                        delay="animate-slideInStagger3"
                                        tooltip="오늘 시험 응시 과정에서 소요된 시간"
                                    />
                                    <DashboardCard
                                        title="오늘 합격률"
                                        value={todayPassRate}
                                        unit="%"
                                        icon={<Target />}
                                        color="bg-emerald-500"
                                        delay="animate-slideInStagger4"
                                        tooltip="오늘 응시 중 합격 횟수의 비율"
                                    />
                                </div>

                                {todayExamStats.length > 0 && (
                                    <div className="space-y-4 animate-fadeIn">
                                        {todayExamStats.map((group, idx) => (
                                            <ExamGroupCard
                                                key={group.groupName}
                                                {...group}
                                                delay={`animate-slideInStagger${(idx % 3) + 1}`}
                                                onDeleteGroup={handleDeleteGroup}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-10">
                                {todayRecords.length > 0 && (
                                    <div className="animate-slideIn">
                                        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                                            <Calendar className="w-4 h-4 mr-2 text-emerald-500" />
                                            오늘의 시험 기록
                                            <span className="ml-2 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] rounded-full font-bold">
                                                {todayRecords.length}
                                            </span>
                                        </h3>
                                        <div className="space-y-4">
                                            {todayRecords.map((record, idx) => (
                                                <div
                                                    key={record.id}
                                                    style={{
                                                        animationDelay: `${idx * 0.05}s`,
                                                        borderLeftColor: `hsl(${Math.max(0, Math.min(100, record.score)) * 1.2}, 80%, 45%)`
                                                    }}
                                                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-l-4 border border-gray-200 dark:border-slate-700 p-4 md:p-6 transition-all hover:shadow-md animate-slideIn"
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                                            <div className="flex-shrink-0">
                                                                <ResultCharacter score={record.score} size={64} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${record.isPass ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                        {record.isPass ? 'PASS' : 'FAIL'}
                                                                    </span>
                                                                    {record.isRetry && (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                                                            재시험
                                                                        </span>
                                                                    )}
                                                                    <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center ml-1">
                                                                        <Clock className="w-3 h-3 mr-1" />
                                                                        {formatDate(record.timestamp).split(' ').slice(2).join(' ')}
                                                                    </span>
                                                                </div>
                                                                <h3 className="font-semibold text-gray-800 dark:text-white text-base md:text-lg mb-0.5 truncate">
                                                                    {resolveExamGroupId(record.examNames)}
                                                                </h3>
                                                                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium truncate">
                                                                    {record.examNames.join(', ')}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex-shrink-0 flex items-center bg-gray-50 dark:bg-slate-700 p-3 rounded-lg w-full md:w-[300px] lg:w-[320px]">
                                                            <div className="grid grid-cols-3 w-full">
                                                                <div className="text-center">
                                                                    <p className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold mb-0.5">Score</p>
                                                                    <StatTooltip text="시험 점수">
                                                                        <p className={`text-sm md:text-base font-bold ${record.isPass ? 'text-success' : 'text-danger'}`}>
                                                                            {record.score}%
                                                                        </p>
                                                                    </StatTooltip>
                                                                </div>
                                                                <div className="text-center border-x border-gray-200 dark:border-slate-600 px-1 text-xs">
                                                                    <p className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold mb-0.5">Accuracy</p>
                                                                    <StatTooltip text="맞힌 문제 / 전체 문제">
                                                                        <p className="text-sm md:text-base font-bold text-gray-700 dark:text-slate-200">
                                                                            {record.correctCount}/{record.totalQuestions}
                                                                        </p>
                                                                    </StatTooltip>
                                                                </div>
                                                                <div className="text-center pl-1">
                                                                    <p className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold mb-0.5">Time</p>
                                                                    <StatTooltip text="시험 소요 시간">
                                                                        <p className="text-sm md:text-base font-bold text-gray-700 dark:text-slate-200 whitespace-nowrap">
                                                                            {Math.floor((record.timeTakenSeconds || 0) / 60)}분 {(record.timeTakenSeconds || 0) % 60}초
                                                                        </p>
                                                                    </StatTooltip>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap md:flex-row items-center gap-2 self-end md:self-center">
                                                            <button
                                                                onClick={() => setSelectedRecordForDetails(record)}
                                                                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-lg transition-all text-[11px] font-bold border border-gray-200 dark:border-slate-600 hover:border-indigo-200 shadow-sm"
                                                                title="틀린 문제 보기"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                틀린 문제 보기
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDelete(record.id, e)}
                                                                className="p-2 text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                                title="삭제"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {previousRecords.length > 0 && (
                                    <div className="animate-slideIn">
                                        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                            이전 시험 기록
                                            <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-[10px] rounded-full font-bold">
                                                {previousRecords.length}
                                            </span>
                                        </h3>
                                        <div className="space-y-4">
                                            {previousRecords.map((record, idx) => (
                                                <div
                                                    key={record.id}
                                                    style={{
                                                        animationDelay: `${idx * 0.05}s`,
                                                        borderLeftColor: `hsl(${Math.max(0, Math.min(100, record.score)) * 1.2}, 80%, 45%)`
                                                    }}
                                                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-l-4 border border-gray-200 dark:border-slate-700 p-4 md:p-6 transition-all hover:shadow-md animate-slideIn"
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                                            <div className="flex-shrink-0">
                                                                <ResultCharacter score={record.score} size={64} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${record.isPass ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                        {record.isPass ? 'PASS' : 'FAIL'}
                                                                    </span>
                                                                    {record.isRetry && (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                                                            재시험
                                                                        </span>
                                                                    )}
                                                                    <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center ml-1">
                                                                        <Calendar className="w-3 h-3 mr-1" />
                                                                        {formatDate(record.timestamp)}
                                                                    </span>
                                                                </div>
                                                                <h3 className="font-semibold text-gray-800 dark:text-white text-base md:text-lg mb-0.5 truncate">
                                                                    {resolveExamGroupId(record.examNames)}
                                                                </h3>
                                                                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium truncate">
                                                                    {record.examNames.join(', ')}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex-shrink-0 flex items-center bg-gray-50 dark:bg-slate-700 p-3 rounded-lg w-full md:w-[300px] lg:w-[320px]">
                                                            <div className="grid grid-cols-3 w-full">
                                                                <div className="text-center">
                                                                    <p className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold mb-0.5">Score</p>
                                                                    <StatTooltip text="시험 점수">
                                                                        <p className={`text-sm md:text-base font-bold ${record.isPass ? 'text-success' : 'text-danger'}`}>
                                                                            {record.score}%
                                                                        </p>
                                                                    </StatTooltip>
                                                                </div>
                                                                <div className="text-center border-x border-gray-200 dark:border-slate-600 px-1 text-xs">
                                                                    <p className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold mb-0.5">Accuracy</p>
                                                                    <StatTooltip text="맞힌 문제 / 전체 문제">
                                                                        <p className="text-sm md:text-base font-bold text-gray-700 dark:text-slate-200">
                                                                            {record.correctCount}/{record.totalQuestions}
                                                                        </p>
                                                                    </StatTooltip>
                                                                </div>
                                                                <div className="text-center pl-1">
                                                                    <p className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold mb-0.5">Time</p>
                                                                    <StatTooltip text="시험 소요 시간">
                                                                        <p className="text-sm md:text-base font-bold text-gray-700 dark:text-slate-200 whitespace-nowrap">
                                                                            {Math.floor((record.timeTakenSeconds || 0) / 60)}분 {(record.timeTakenSeconds || 0) % 60}초
                                                                        </p>
                                                                    </StatTooltip>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap md:flex-row items-center gap-2 self-end md:self-center">
                                                            <button
                                                                onClick={() => setSelectedRecordForDetails(record)}
                                                                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-lg transition-all text-[11px] font-bold border border-gray-200 dark:border-slate-600 hover:border-indigo-200 shadow-sm"
                                                                title="틀린 문제 보기"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                상세 보기
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDelete(record.id, e)}
                                                                className="p-2 text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                                title="삭제"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Wrong Questions Detail Modal */}
            {selectedRecordForDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideIn">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-indigo-500" />
                                    틀린 문제 상세 검토
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                    {resolveExamGroupId(selectedRecordForDetails.examNames)} • {formatDate(selectedRecordForDetails.timestamp)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const wrongIds = selectedRecordForDetails.wrongQuestionIds || [];
                                    const detailedQuestions = wrongIds.map(id => allQuestionsMap[id]).filter(Boolean);
                                    if (detailedQuestions.length > 0) {
                                        return (
                                            <button
                                                onClick={() => {
                                                    const wrongQuestionsText = detailedQuestions.map((q, idx) => `
문제 ${idx + 1}: ${q.question}
답: ${q.answer}
해설: ${q.explanation}
`).join('\n---\n');
                                                    const examCodes = Array.from(new Set(detailedQuestions.map(q => q.sourceVersion || '')));
                                                    const prompt = `다음은 내가 틀린 문제들이다. [${examCodes.join(', ')}] 시험의 기출문제들이야. 이 문제들과 비슷한 유형의 퀴즈를 내줘:\n\n${wrongQuestionsText}`;
                                                    navigator.clipboard.writeText(prompt).then(() => {
                                                        setCopiedBulk(true);
                                                        showToast("클립보드에 복사되었습니다! 제미나이나 ChatGPT 등에 붙여넣어 질문해보세요.");
                                                        setTimeout(() => setCopiedBulk(false), 2000);
                                                    });
                                                }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${copiedBulk ? 'bg-emerald-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800'}`}
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                                {copiedBulk ? "복사 완료!" : "전체 AI 유사문제 요청"}
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}
                                <button
                                    onClick={() => setSelectedRecordForDetails(null)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30 dark:bg-slate-900/20">
                            {(() => {
                                const wrongIds = selectedRecordForDetails.wrongQuestionIds || [];
                                const detailedQuestions = wrongIds
                                    .map(id => allQuestionsMap[id])
                                    .filter(Boolean);

                                if (wrongIds.length === 0) {
                                    return (
                                        <div className="py-12 text-center">
                                            <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl mb-4">
                                                <Award className="w-10 h-10 text-emerald-500" />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-800 dark:text-white">틀린 문제가 없습니다!</h4>
                                            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">만점입니다. 완벽하게 이해하고 계시네요!</p>
                                        </div>
                                    );
                                }

                                if (detailedQuestions.length === 0 && wrongIds.length > 0) {
                                    return (
                                        <div className="py-12 text-center">
                                            <div className="inline-flex p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl mb-4">
                                                <Cloud className="w-10 h-10 text-amber-500" />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-800 dark:text-white">문제 데이트를 찾을 수 없습니다</h4>
                                            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
                                                이전 데이터 버전이거나 현재 로드된 문제 은행에 해당 문제가 포함되어 있지 않습니다.
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-6">
                                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 border-l-4 border-indigo-500 pl-3">
                                            총 {detailedQuestions.length}개의 틀린 문제를 검토합니다.
                                        </p>
                                        {detailedQuestions.map((q, idx) => (
                                            <div key={q.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Question {idx + 1}</span>
                                                    <span className="text-[10px] px-2 py-0.5 bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-md font-bold uppercase">{q.sourceVersion}</span>
                                                </div>
                                                <div className="p-5">
                                                    <p className="text-sm md:text-base font-bold text-gray-800 dark:text-white mb-6 whitespace-pre-wrap leading-relaxed">{q.question}</p>

                                                    <div className="space-y-2 mb-6">
                                                        {q.options.map((opt, i) => {
                                                            const label = opt.split('.')[0].trim();
                                                            const isCorrect = q.answer.includes(label);
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`p-3 rounded-lg border text-sm transition-colors ${isCorrect
                                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium'
                                                                        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                                                                        }`}
                                                                >
                                                                    {opt}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-100 dark:border-amber-900/20 mb-4">
                                                        <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
                                                            <BookOpen className="w-4 h-4" />
                                                            <span className="text-xs font-bold uppercase tracking-tight">해설 (Explanation)</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                            {q.explanation}
                                                        </p>
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
                                                                const allOptionsText = q.options.map(opt => opt.replace(/^[A-Z]\.\s*/, '')).join('\n');
                                                                const text = `${q.question} 에 대한 답은 ${correctText} 이야. 이 문제에 대해 상세히 설명해주고, 관련 개념과 시험 대비 팁도 알려줘.\n다른 선택지는\n${allOptionsText} \n 이 있어.`;

                                                                navigator.clipboard.writeText(text).then(() => {
                                                                    setCopiedId(q.id);
                                                                    showToast("클립보드에 복사되었습니다! 제미나이나 ChatGPT 등에 붙여넣어 질문해보세요.");
                                                                    setTimeout(() => setCopiedId(null), 2000);
                                                                });
                                                            }}
                                                            className={`flex items-center text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm ${copiedId === q.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600'} `}
                                                        >
                                                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                                                            {copiedId === q.id ? "복사 완료!" : "AI에게 질문하기 복사"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex justify-end">
                            <button
                                onClick={() => setSelectedRecordForDetails(null)}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm"
                            >
                                확인 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
