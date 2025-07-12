import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';

import { OctopusLogo, LoginIcon } from '../components/Icons';
import { useAuth } from '../hooks/useAuth';
import { auth, provider } from '../firebase/firebase';

/* -------------------------------------------------- */
/*  LoginPage                                         */
/* -------------------------------------------------- */
const LoginPage: React.FC = () => {
  /* 状態管理 */
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /* カスタムフック & ルーター */
  const { login } = useAuth();
  const navigate = useNavigate();

  /* Google ログイン */
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Googleログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  /* メールアドレスでログイン */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError('');
      const user = await login(email);
      if (user) navigate('/');
      else setError('ユーザーが見つかりません。デモ用メールアドレスをお試しください。');
    } catch {
      setError('ログイン中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------- JSX ------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <OctopusLogo className="mx-auto h-20 w-auto text-primary" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            勤怠管理システム「だこくん」
          </h2>
          <p className="mt-2 text-sm text-gray-600">アカウントにログイン</p>
        </div>

        {/* メールログインフォーム */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス (例: tanaka@example.com)"
            className="appearance-none rounded-md w-full px-3 py-3 border border-gray-300 placeholder-gray-400 focus:ring-primary focus:border-primary sm:text-sm"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 rounded-md text-white bg-primary hover:bg-primary-dark disabled:bg-gray-400"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <LoginIcon className="h-5 w-5 text-primary-light" />
            </span>
            {isLoading ? 'ログイン中...' : 'メールでログイン'}
          </button>

          {/* デモアカウント */}
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>デモ用アカウント:</p>
            <p>社員: tanaka@example.com</p>
            <p>上長: suzuki@example.com</p>
            <p>管理者: takahashi@example.com</p>
          </div>
        </form>

        {/* Google ログイン */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md bg-white text-sm font-medium hover:bg-gray-50"
        >
          Googleでログイン
        </button>

        {/* 新規登録リンク */}
        <p className="text-sm text-center text-gray-600">
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
