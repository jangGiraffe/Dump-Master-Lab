import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Edit3, X, Clock, Target, Trash2 } from 'lucide-react';
import { examService, UserExamConfig } from '@/shared/api/examService';

interface DDayCounterProps {
    userId: string;
    className?: string;
}

export const DDayCounter: React.FC<DDayCounterProps> = ({ userId, className = '' }) => {
    const [examInfo, setExamInfo] = useState<UserExamConfig | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [tempInfo, setTempInfo] = useState<UserExamConfig>({ date: '', time: '09:00', code: '' });
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; mins: number; secs: number } | null>(null);
    const [loading, setLoading] = useState(true);

    // Load Initial Data
    useEffect(() => {
        const loadConfig = async () => {
            setLoading(true);
            const config = await examService.getUserExamConfig(userId);
            if (config) {
                setExamInfo(config);
                setTempInfo(config);
            }
            setLoading(false);
        };
        loadConfig();
    }, [userId]);

    const calculateTimeLeft = useCallback(() => {
        if (!examInfo || !examInfo.date) return null;

        const target = new Date(`${examInfo.date}T${examInfo.time || '00:00'}:00`);
        const now = new Date();
        const diff = target.getTime() - now.getTime();

        if (diff <= 0) return null;

        return {
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
            mins: Math.floor((diff / 1000 / 60) % 60),
            secs: Math.floor((diff / 1000) % 60)
        };
    }, [examInfo]);

    useEffect(() => {
        if (!examInfo) {
            setTimeLeft(null);
            return;
        }

        const timer = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
        }, 1000);

        setTimeLeft(calculateTimeLeft());
        return () => clearInterval(timer);
    }, [examInfo, calculateTimeLeft]);

    const handleSave = async () => {
        if (tempInfo.date && tempInfo.code) {
            await examService.saveUserExamConfig(userId, tempInfo);
            setExamInfo(tempInfo);
            setIsEditing(false);
        } else {
            alert('시험 코드와 날짜를 모두 입력해주세요!');
        }
    };

    const handleClear = async () => {
        if (window.confirm('등록된 시험 일정을 삭제할까요?')) {
            await examService.deleteUserExamConfig(userId);
            setExamInfo(null);
            setTempInfo({ date: '', time: '09:00', code: '' });
            setIsEditing(false);
        }
    };

    if (loading) return null;

    if (isEditing) {
        return (
            <div className={`bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-indigo-100 dark:border-slate-700 animate-fadeIn ${className}`}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg transition-colors">
                            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-lg font-bold text-gray-800 dark:text-slate-100 transition-colors">시험 일정 등록</span>
                    </div>
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 mb-1.5 ml-1 uppercase tracking-wider transition-colors">Exam Code / Description</label>
                        <div className="relative">
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="예: AWS SAA-C03"
                                value={tempInfo.code}
                                onChange={(e) => setTempInfo({ ...tempInfo, code: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 mb-1.5 ml-1 uppercase tracking-wider transition-colors">Date</label>
                            <input
                                type="date"
                                value={tempInfo.date}
                                onChange={(e) => setTempInfo({ ...tempInfo, date: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 mb-1.5 ml-1 uppercase tracking-wider transition-colors">Time</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-600 transition-colors" />
                                <input
                                    type="time"
                                    value={tempInfo.time}
                                    onChange={(e) => setTempInfo({ ...tempInfo, time: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleSave}
                            className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                        >
                            일정 저장하기
                        </button>
                        {examInfo && (
                            <button
                                onClick={handleClear}
                                className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 transition-all"
                                title="삭제"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Dark background for both modes but slightly adjusted colors for consistent premium feel
    return (
        <div
            onClick={() => {
                setTempInfo(examInfo || { date: '', time: '09:00', code: '' });
                setIsEditing(true);
            }}
            className={`group bg-gradient-to-br from-indigo-900 to-slate-900 dark:from-slate-800 dark:to-slate-950 p-6 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden ${className}`}
        >
            {/* Background patterns */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -ml-12 -mb-12" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner group-hover:bg-white transition-all">
                        <Calendar className="w-7 h-7 text-white group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-100 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-400/30">
                                Target Exam
                            </span>
                            {examInfo && (
                                <span className="text-white/60 text-[10px] font-medium font-mono">
                                    {examInfo.date} {examInfo.time}
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-black text-white leading-tight">
                            {examInfo ? examInfo.code : '시험 일정을 등록하세요'}
                        </h3>
                    </div>
                </div>

                {examInfo && (
                    <div className="flex items-center">
                        {timeLeft ? (
                            <div className="flex gap-3">
                                {[
                                    { label: 'Days', value: timeLeft.days },
                                    { label: 'Hrs', value: timeLeft.hours },
                                    { label: 'Min', value: timeLeft.mins },
                                    { label: 'Sec', value: timeLeft.secs },
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center">
                                        <div className="w-12 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-center">
                                            <span className="text-xl font-black text-white font-mono tabular-nums leading-none">
                                                {String(item.value).padStart(2, '0')}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-bold text-indigo-300 mt-1 uppercase tracking-tighter opacity-80">
                                            {item.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-6 py-2 bg-emerald-500/20 rounded-2xl border border-emerald-400/30">
                                <span className="text-emerald-300 font-black text-sm uppercase tracking-widest">
                                    Exam Started / Completed!
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {!examInfo && (
                    <div className="flex items-center gap-2 text-white/40 font-bold text-sm">
                        <Edit3 className="w-4 h-4" />
                        <span>Click to set schedule</span>
                    </div>
                )}
            </div>

            {examInfo && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-xs text-white/40 font-medium">Cloud Sync Protected</span>
                    </div>
                    <div className="text-[10px] text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Edit3 className="w-3 h-3" />
                        SCHEDULE EDIT
                    </div>
                </div>
            )}
        </div>
    );
};
