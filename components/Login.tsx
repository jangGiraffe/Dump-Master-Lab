import React, { useState } from 'react';
import { authenticateUser } from '../utils';
import { UserTier } from '../types';
import { Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (tier: UserTier, userId: string, password?: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isGuestMode, setIsGuestMode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setError('사용자 ID를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isGuestMode) {
        onLogin('G', userId.trim());
      } else {
        const tier = await authenticateUser(password);
        if (tier) {
          onLogin(tier, userId.trim(), password);
        } else {
          setError('비밀번호가 올바르지 않습니다.');
          setPassword('');
        }
      }
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-4 rounded-full">
            <Lock className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {isGuestMode ? 'Guest 접속' : '시험 접속'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
              사용자 ID (동기화용)
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors placeholder-gray-400"
              placeholder="본인만의 ID를 입력하세요"
              autoFocus
            />
          </div>

          {!isGuestMode && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors placeholder-gray-400"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
          )}

          {error && <p className="text-danger text-sm text-center">{error}</p>}

          <button
            type="submit"
            className={`w-full bg-primary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? '확인 중...' : '시작하기'}
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase bg-white px-2 text-gray-500">
              OR
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsGuestMode(!isGuestMode)}
            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium py-2 px-4 rounded-md transition-colors border border-gray-200 text-sm"
          >
            {isGuestMode ? '비밀번호 로그인으로 변경' : 'Guest 모드로 전환'}
          </button>
        </form>
      </div>
    </div>
  );
};