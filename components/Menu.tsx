import React from 'react';
import { BookOpen, PenTool, LogOut, BarChart2, Swords } from 'lucide-react';

import { UserTier } from '../types';

interface MenuProps {
  onSelectMode: (mode: 'quiz' | 'study' | 'history') => void;
  onLogout: () => void;
  userTier: UserTier | null;
}

export const Menu: React.FC<MenuProps> = ({ onSelectMode, onLogout, userTier }) => {
  return (
    <div className="flex-grow bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="flex flex-col items-center mb-10">
          <h1 className="text-2xl md:text-3xl font-semibold text-center text-gray-900">
            Dump Master Lab
          </h1>
          <p className="text-gray-500 text-center mt-2 text-sm md:text-base">
            계속하려면 모드를 선택하세요
          </p>

          {userTier && (
            <div className={`
              mt-4 mb-0 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm border
              ${userTier === 'V'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : userTier === 'N'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-gray-300'
              }
            `}>
              {userTier === 'V' ? '👑 VIP 회원' : userTier === 'N' ? '😊 일반 회원' : '👀 체험하기 (Guest)'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Quiz Mode Card */}
          <div
            onClick={() => onSelectMode('quiz')}
            className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer flex items-center gap-6"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
              <PenTool className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-800 mb-1">실전 모의고사</h2>
              <p className="text-gray-500 text-xs">
                시간 제한 설정 및 즉각적인 피드백으로 실전 감각을 익히세요.
              </p>
            </div>
          </div>

          {/* Boss Raid Card (NEW) */}
          <div
            onClick={() => onSelectMode('boss-raid')}
            className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-red-300 transition-all cursor-pointer flex items-center gap-6"
          >
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors text-red-600">
              <Swords className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-800 mb-1">오답 보스전</h2>
              <p className="text-gray-500 text-xs">
                지금까지 틀린 문제들만 모아 완벽하게 정복하세요. (오답 노트)
              </p>
            </div>
          </div>

          {/* Study Mode Card */}
          <div
            onClick={() => {
              if (userTier === 'V') {
                onSelectMode('study');
              }
            }}
            className={`group bg-white p-6 rounded-2xl shadow-sm border border-gray-200 transition-all flex items-center gap-6 relative
              ${userTier === 'V'
                ? 'hover:shadow-xl hover:border-success/30 cursor-pointer'
                : 'opacity-60 cursor-not-allowed'
              }`}
          >
            {userTier !== 'V' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 rounded-2xl opacity-0 hover:opacity-100 transition-opacity z-10 backdrop-blur-[1px]">
                <span className="bg-black/80 text-white text-[10px] py-1 px-3 rounded shadow-lg font-medium">
                  👑 VIP 전용
                </span>
              </div>
            )}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors 
              ${userTier === 'V'
                ? 'bg-green-50 text-success group-hover:bg-success group-hover:text-white'
                : 'bg-gray-100 text-gray-400'
              }`}>
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h2 className={`text-lg font-bold mb-1 ${userTier === 'V' ? 'text-gray-800' : 'text-gray-500'}`}>
                학습 자료실
              </h2>
              <p className="text-gray-500 text-xs text-pretty">
                PDF 가이드, 요약표 등 공식 학습 자료를 열람하세요.
              </p>
            </div>
          </div>

          {/* History Mode Card */}
          <div
            onClick={() => onSelectMode('history')}
            className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer flex items-center gap-6"
          >
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors text-purple-600">
              <BarChart2 className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-800 mb-1">나의 기록</h2>
              <p className="text-gray-500 text-xs">
                과거 응시 기록, 점수 추이 및 학습 잔디를 확인하세요.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={onLogout}
            className="text-gray-400 hover:text-gray-600 flex items-center justify-center mx-auto text-xs font-medium transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};
