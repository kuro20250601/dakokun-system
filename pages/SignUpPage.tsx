import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUpUser } from '../firebase/auth'; // ★ 作成した関数をインポート！

const SignUpPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!name || !email || !password) {
      setError('すべての項目を入力してください。');
      setIsLoading(false);
      return;
    }

    try {
      // ★ ここで実際にFirebaseへの登録処理を呼び出す！
      await signUpUser(email, password, name);
      alert('アカウントが正常に作成されました！ログインページに移動します。');
      navigate('/login'); // 成功したらログインページへ
    } catch (err: any) {
      // Firebaseからのエラーメッセージを分かりやすく表示
      if (err.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に使用されています。');
      } else {
        setError('サインアップに失敗しました。もう一度お試しください。');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ... return (...) の中のJSX部分は変更なし ...
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">新規アカウント登録</h2>
        <form className="space-y-6" onSubmit={handleSignUp}>
          <div>
            <label htmlFor="name" className="text-sm font-medium text-gray-700">名前</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm" placeholder="山田 太郎" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">メールアドレス</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm" placeholder="email@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700">パスワード</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm" placeholder="6文字以上" />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div>
            <button type="submit" disabled={isLoading} className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-dark disabled:bg-gray-400">
              {isLoading ? '登録中...' : '登録する'}
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-600">
          アカウントをお持ちですか？{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
            ログインはこちら
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;