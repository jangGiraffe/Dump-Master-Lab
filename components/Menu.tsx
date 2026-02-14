import React from 'react';
import { BookOpen, PenTool, LogOut } from 'lucide-react';

interface MenuProps {
  onSelectMode: (mode: 'quiz' | 'study') => void;
  onLogout: () => void;
}

export const Menu: React.FC<MenuProps> = ({ onSelectMode, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Reduced title font size */}
        <h1 className="text-2xl md:text-3xl font-semibold text-center text-gray-900 mb-2">
          Dump Master Lab
        </h1>
        <p className="text-gray-500 text-center mb-12 text-sm md:text-base">
          계속하려면 모드를 선택하세요
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Quiz Mode Card */}
          <div
            onClick={() => onSelectMode('quiz')}
            className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
              <PenTool className="w-8 h-8" />
            </div>
            {/* Reduced card title font size */}
            <h2 className="text-xl font-semibold text-gray-800 mb-3">실전 모의고사</h2>
            <p className="text-gray-500 text-sm">
              실제 기출 문제, 시간 제한 설정 및 즉각적인 피드백으로 연습하세요.
            </p>
          </div>

          {/* Study Mode Card */}
          <div
            onClick={() => onSelectMode('study')}
            className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-success/30 transition-all cursor-pointer flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-success group-hover:text-white transition-colors text-success">
              <BookOpen className="w-8 h-8" />
            </div>
            {/* Reduced card title font size */}
            <h2 className="text-xl font-semibold text-gray-800 mb-3">학습 자료실</h2>
            <p className="text-gray-500 text-sm">
              PDF 가이드, 요약표, 참고 문서를 열람하고 학습하세요.
            </p>
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