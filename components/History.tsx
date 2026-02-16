
import React, { useState, useEffect } from 'react';
import { HistoryRecord } from '../types';
import { historyService } from '../services/historyService';
import { formatTime, ResultCharacter } from '../utils';
import { ChevronLeft, Trash2, Calendar, Award, Clock, BarChart2, BarChart3, BookOpen, Target } from 'lucide-react';

interface HistoryProps {
    onBack: () => void;
}

const DashboardCard: React.FC<{ title: string; subtitle?: string; value: string | number; unit?: string; icon: React.ReactNode; color: string; delay?: string }> = ({ title, subtitle, value, unit, icon, color, delay }) => (
    <div className={`bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 animate-slideIn ${delay || ''}`}>
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
        if (count === 0) return 'bg-gray-100';
        if (count < 65) return 'bg-emerald-200';
        if (count < 130) return 'bg-emerald-400';
        if (count < 260) return 'bg-emerald-600';
        return 'bg-emerald-800';
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-8 animate-slideIn">
            <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center">
                <Calendar className="w-3 h-3 mr-2" />
                학습 잔디 (최근 12주)
            </h3>
            <div className="flex flex-wrap gap-1.5">
                {heatmapDays.map((day, idx) => (
                    <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-[2px] ${getColor(day.count)} transition-all hover:ring-2 hover:ring-emerald-300 cursor-help`}
                        title={`${day.date}: ${day.count}개 완료`}
                    />
                ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Less</span>
                <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-gray-100" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-200" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-400" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-600" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-800" />
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">More</span>
            </div>
        </div>
    );
};

export const History: React.FC<HistoryProps> = ({ onBack }) => {
    const [records, setRecords] = useState<HistoryRecord[]>([]);

    useEffect(() => {
        setRecords(historyService.getRecords());
    }, []);

    // 최근 20개 기록 추출
    const last20Records = records.slice(0, 20);

    // 평균 정답률 (최근 20회)
    const avgScore = last20Records.length > 0
        ? Math.round(last20Records.reduce((acc, r) => acc + r.score, 0) / last20Records.length)
        : 0;

    // 누적 푼 문제 수 (최근 20회)
    const totalSolved = last20Records.reduce((acc, r) => acc + r.totalQuestions, 0);

    // 오늘 푼 데이터 계산 (정답 수 / 전체 문제 수)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayRecords = records.filter(r => r.timestamp >= startOfToday);
    const todaySolvedCount = todayRecords.reduce((acc, r) => acc + r.totalQuestions, 0);
    const todayCorrectCount = todayRecords.reduce((acc, r) => acc + r.correctCount, 0);

    // 최근 합격률 (최근 20회 기준)
    const recentPassRate = last20Records.length > 0
        ? Math.round((last20Records.filter(r => r.isPass).length / last20Records.length) * 100)
        : 0;

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('이 기록을 삭제하시겠습니까?')) {
            historyService.deleteRecord(id);
            setRecords(historyService.getRecords());
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
        <div className="flex flex-col flex-grow bg-gray-50 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center mb-6">
                    <button
                        onClick={onBack}
                        className="mr-4 p-2 hover:bg-white rounded-full transition-colors text-gray-600 shadow-sm border bg-white/50"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">나의 기록</h2>
                </div>

                {records.length > 0 && (
                    <>
                        <ActivityHeatmap records={records} />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <DashboardCard
                                title="평균 정답률"
                                subtitle="Last 20"
                                value={avgScore}
                                unit="%"
                                icon={<BarChart3 />}
                                color="bg-blue-600"
                                delay="animate-slideInStagger1"
                            />
                            <DashboardCard
                                title="누적 문제 수"
                                subtitle="Last 20"
                                value={totalSolved}
                                unit="개"
                                icon={<BookOpen />}
                                color="bg-indigo-600"
                                delay="animate-slideInStagger2"
                            />
                            <DashboardCard
                                title="오늘 정답 수"
                                value={todayCorrectCount}
                                unit={`/ ${todaySolvedCount} 개`}
                                icon={<Calendar />}
                                color="bg-emerald-600"
                                delay="animate-slideInStagger3"
                            />
                            <DashboardCard
                                title="최근 합격률"
                                subtitle="Last 20"
                                value={recentPassRate}
                                unit="%"
                                icon={<Target />}
                                color="bg-rose-600"
                                delay="animate-slideInStagger4"
                            />
                        </div>
                    </>
                )}

                {records.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <BarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">아직 응시한 시험 기록이 없습니다.</p>
                        <button
                            onClick={onBack}
                            className="mt-4 text-primary font-medium hover:underline"
                        >
                            시험 보러 가기
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {records.map((record) => (
                            <div
                                key={record.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 transition-all hover:shadow-md"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-shrink-0">
                                        <ResultCharacter score={record.score} size={64} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${record.isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {record.isPass ? 'PASS' : 'FAIL'}
                                            </span>
                                            {record.isRetry && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                                    재시험
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400 flex items-center ml-1">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {formatDate(record.timestamp)}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-gray-800 text-base md:text-lg mb-1">
                                            {record.examNames.join(', ')}
                                        </h3>
                                    </div>

                                    <div className="flex items-center bg-gray-50 p-3 rounded-lg w-full md:w-auto md:gap-8">
                                        <div className="flex-1 text-center">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Score</p>
                                            <p className={`text-base md:text-lg font-bold ${record.isPass ? 'text-success' : 'text-danger'}`}>
                                                {record.score}%
                                            </p>
                                        </div>
                                        <div className="flex-1 text-center border-x border-gray-200 px-2 md:px-8">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Accuracy</p>
                                            <p className="text-base md:text-lg font-bold text-gray-700">
                                                {record.correctCount}/{record.totalQuestions}
                                            </p>
                                        </div>
                                        <div className="flex-1 text-center">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Time</p>
                                            <p className="text-base md:text-lg font-bold text-gray-700 whitespace-nowrap">
                                                {Math.floor(record.timeTakenSeconds / 60)}분 {record.timeTakenSeconds % 60}초
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => handleDelete(record.id, e)}
                                        className="p-2 text-gray-300 hover:text-red-500 transition-colors md:ml-2 self-end md:self-center"
                                        title="삭제"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
