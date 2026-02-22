import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Edit3, X, Clock, Target, Trash2, Loader2 } from 'lucide-react';
import { examService, UserExamConfig } from '@/shared/api/examService';
import { UserTier } from '@/shared/model/types';

interface DDayCounterProps {
    userId: string;
    userTier: UserTier | null;
    className?: string;
}

export const DDayCounter: React.FC<DDayCounterProps> = ({ userId, userTier, className = '' }) => {
    const [examInfo, setExamInfo] = useState<UserExamConfig | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [tempInfo, setTempInfo] = useState<UserExamConfig>({ date: '', time: '09:00', code: '' });
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; mins: number; secs: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    // Load Initial Data
    useEffect(() => {
        const loadConfig = async () => {
            // Guest users should not load/see D-Day info even if it exists locally
            if (userTier === 'G' || !userId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const config = await examService.getUserExamConfig(userId);
            if (config) {
                setExamInfo(config);
                setTempInfo(config);
            }
            setLoading(false);
        };
        loadConfig();
    }, [userId, userTier]);

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
        if (userTier === 'G') {
            showToast('체험하기 모드에서는 일정을 등록할 수 없습니다.');
            setIsEditing(false);
            return;
        }

        if (tempInfo.date && tempInfo.code) {
            await examService.saveUserExamConfig(userId, tempInfo);
            setExamInfo(tempInfo);
            setIsEditing(false);
            showToast('시험 일정이 성공적으로 저장되었습니다!');
        } else {
            showToast('시험 코드와 날짜를 모두 입력해주세요.');
        }
    };

    const handleClear = async () => {
        if (window.confirm('등록된 시험 일정을 삭제할까요?')) {
            await examService.deleteUserExamConfig(userId);
            setExamInfo(null);
            setTempInfo({ date: '', time: '09:00', code: '' });
            setIsEditing(false);
            showToast('일정이 삭제되었습니다.');
        }
    };

    if (loading) {
        return (
            <div className={`relative w-full bg-slate-900/40 py-4 md:py-5 px-6 md:px-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 overflow-hidden ${className}`}>
                {/* Blurred Content Proxy */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 blur-md opacity-20 pointer-events-none select-none">
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="w-10 h-10 bg-white/20 rounded-xl" />
                        <div className="space-y-1.5">
                            <div className="h-4 w-32 bg-white/20 rounded" />
                            <div className="h-2 w-20 bg-white/10 rounded" />
                        </div>
                    </div>
                    <div className="flex-grow max-w-sm w-full">
                        <div className="grid grid-cols-4 gap-2 md:gap-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5">
                                    <div className="w-full aspect-square bg-white/10 rounded-xl" />
                                    <div className="h-2 w-full bg-white/5 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Loading Spinner Overaly */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin relative z-10" />
                        </div>
                        <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.2em] animate-pulse">
                            Loading Config
                        </span>
                    </div>
                </div>
            </div>
        );
    }

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
        <div className="relative">
            {/* Toast Notification Layer */}
            {toastMsg && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-[100] animate-slideUp">
                    <div className="bg-indigo-600/90 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-bold shadow-2xl border border-white/20 whitespace-nowrap">
                        {toastMsg}
                    </div>
                </div>
            )}

            <div
                onClick={() => {
                    if (userTier === 'G') {
                        showToast('체험하기 모드에서는 등록할 수 없습니다.');
                        return;
                    }
                    setTempInfo(examInfo || { date: '', time: '09:00', code: '' });
                    setIsEditing(true);
                }}
                className={`group bg-gradient-to-br from-indigo-600/90 via-slate-900 to-black dark:from-indigo-950/50 dark:via-slate-900/80 dark:to-black py-5 md:py-6 px-6 md:px-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-700 cursor-pointer relative overflow-hidden border border-white/10 backdrop-blur-md animate-fadeIn ${className}`}
            >
                {/* dynamic background lighting */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-1000" />

                {/* Subtle gloss effect over the card */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 md:gap-8">
                    {/* Left Side: Header & Info */}
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-12 h-12 md:w-13 md:h-13 bg-white/10 backdrop-blur-2xl rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shrink-0">
                            <Calendar className="w-6 h-6 text-indigo-300" />
                        </div>

                        <div className="flex flex-col items-start gap-1.5 min-w-0">
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-sm leading-tight truncate w-full">
                                {examInfo ? examInfo.code : '시험 일정을 등록하세요'}
                            </h3>

                            {examInfo && (
                                <div className="flex items-center gap-2 text-indigo-300/60 text-xs md:text-sm font-bold tracking-tight">
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-md border border-white/10">
                                        <Clock className="w-3 h-3 text-indigo-400" />
                                        <span>{examInfo.date.replace(/-/g, '.')}</span>
                                    </div>
                                    <span className="opacity-40">·</span>
                                    <span className="text-white/40">{examInfo.time}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Countdown Grid - Refined for mobile */}
                    {examInfo && (
                        <div className="w-full sm:max-w-[280px] md:max-w-sm">
                            {timeLeft ? (
                                <div className="grid grid-cols-4 gap-2.5 md:gap-3">
                                    {[
                                        { label: 'Days', value: timeLeft.days, color: 'from-blue-400 to-indigo-400' },
                                        { label: 'Hrs', value: timeLeft.hours, color: 'from-indigo-400 to-purple-400' },
                                        { label: 'Min', value: timeLeft.mins, color: 'from-purple-400 to-pink-400' },
                                        { label: 'Sec', value: timeLeft.secs, color: 'from-pink-400 to-rose-400' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex flex-col items-center group/item">
                                            <div className="relative w-full aspect-[4/5] sm:aspect-square bg-white/[0.07] backdrop-blur-2xl rounded-xl border border-white/10 flex items-center justify-center mb-1.5 shadow-lg group-hover/item:border-white/30 group-hover/item:bg-white/[0.1] transition-all duration-300">
                                                <span className={`text-xl sm:text-2xl font-black bg-gradient-to-b ${item.color} bg-clip-text text-transparent font-mono tabular-nums tracking-tighter`}>
                                                    {String(item.value).padStart(2, '0')}
                                                </span>
                                            </div>
                                            <span className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.15em]">
                                                {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-3 px-6 bg-emerald-500/15 backdrop-blur-2xl rounded-2xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)] animate-pulse">
                                    <span className="text-emerald-400 font-black text-xs md:text-sm uppercase tracking-[0.2em] block text-center">
                                        Target Met!
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {!examInfo && (
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-end sm:justify-start group-hover:translate-x-1 transition-transform pr-2">
                            <span className="text-white/30 font-bold text-sm tracking-wide">클릭하여 일정 추가</span>
                            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center group-hover:border-white/40 group-hover:bg-white/10 transition-all">
                                <Edit3 className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Subtle Footer Overlay */}
                {examInfo && (
                    <div className="absolute bottom-2.5 left-6 right-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none translate-y-1 group-hover:translate-y-0">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">Secure Sync</span>
                        </div>
                        <span className="text-[9px] text-indigo-400 font-black tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">EDIT TO CHANGE</span>
                    </div>
                )}
            </div>
        </div>
    );
};
