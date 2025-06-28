
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { OctopusLogo, LoginIcon } from '../components/Icons';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await login(email);
            if (user) {
                navigate('/');
            } else {
                setError('ユーザーが見つかりません。デモ用のメールアドレスをお試しください。(例: tanaka@example.com)');
            }
        } catch (err) {
            setError('ログイン中にエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <OctopusLogo className="mx-auto h-20 w-auto text-primary" />
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        勤怠管理システム「だこくん」
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        アカウントにログイン
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                メールアドレス
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="メールアドレス (例: tanaka@example.com)"
                            />
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark disabled:bg-gray-400"
                        >
                            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                <LoginIcon className="h-5 w-5 text-primary-light group-hover:text-primary-light" />
                            </span>
                            {isLoading ? 'ログイン中...' : 'ログイン'}
                        </button>
                    </div>
                    <div className="text-center text-xs text-gray-500">
                        <p>デモ用アカウント:</p>
                        <p>社員: tanaka@example.com</p>
                        <p>上長: suzuki@example.com</p>
                        <p>管理者: takahashi@example.com</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
