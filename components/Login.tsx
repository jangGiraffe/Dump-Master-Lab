import React, { useState } from 'react';
import { authenticateUser } from '../utils';
import { UserTier } from '../types';
import { Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (tier: UserTier) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const tier = await authenticateUser(password);
      if (tier) {
        onLogin(tier);
      } else {
        setError('비밀번호가 올바르지 않습니다.');
        setPassword('');
      }
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-4 rounded-full">
            <Lock className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">시험 접속</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoFocus
            />
          </div>
          {error && <p className="text-danger text-sm text-center">{error}</p>}
          <button
            type="submit"
            className={`w-full bg-primary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? '확인 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
};