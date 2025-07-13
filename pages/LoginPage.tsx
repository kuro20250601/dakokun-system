import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { OctopusLogo } from '../components/Icons';

const LoginPage: React.FC = () => {
  const { login, isLoading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      // navigate('/') は呼ばない
    } catch (err: any) {
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center space-y-2">
          <OctopusLogo className="w-16 h-16 text-primary" />
          <h1 className="text-2xl font-bold text-center text-gray-900">勤怠管理システム「だこくん」</h1>
          <p className="text-sm text-gray-500 text-center">アカウントにログイン</p>
        </div>
        <form className="space-y-4" onSubmit={handleLogin}>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            placeholder="メールアドレス (例: tanaka@example.com)"
          />
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            placeholder="パスワード"
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-dark disabled:bg-gray-400"
          >
            {isLoading ? 'ログイン中...' : 'メールでログイン'}
          </button>
        </form>
        <button
          className="w-full mt-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          disabled
        >
          Googleでログイン
        </button>
        <p className="text-sm text-center text-gray-600 mt-2">
          アカウントをお持ちでないですか？{' '}
          <Link to="/signup" className="font-medium text-primary hover:text-primary-dark">
            新規登録はこちら
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
