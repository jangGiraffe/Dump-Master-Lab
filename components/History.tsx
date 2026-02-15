
import React, { useState, useEffect } from 'react';
import { HistoryRecord } from '../types';
import { historyService } from '../services/historyService';
import { formatTime, ResultCharacter } from '../utils';
import { ChevronLeft, Trash2, Calendar, Award, Clock, BarChart2 } from 'lucide-react';

interface HistoryProps {
    onBack: () => void;
}

export const History: React.FC<HistoryProps> = ({ onBack }) => {
    const [records, setRecords] = useState<HistoryRecord[]>([]);

    useEffect(() => {
        setRecords(historyService.getRecords());
    }, []);

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

                                    <div className="flex items-center gap-4 md:gap-8 bg-gray-50 p-3 rounded-lg">
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Score</p>
                                            <p className={`text-lg font-bold ${record.isPass ? 'text-success' : 'text-danger'}`}>
                                                {record.score}%
                                            </p>
                                        </div>
                                        <div className="text-center border-x px-4 md:px-8 border-gray-200">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Accuracy</p>
                                            <p className="text-lg font-bold text-gray-700">
                                                {record.correctCount}/{record.totalQuestions}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Time</p>
                                            <p className="text-lg font-bold text-gray-700">
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
