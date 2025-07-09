import React from 'react';
// ★ HashRouter を BrowserRouter に変更
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'; 
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import Header from './components/Header';

// --- 保護されたルートのためのコンポーネント ---
// ログインしていないユーザーをログインページにリダイレクトします
const ProtectedRoute: React.FC = () => {
    const { user, isLoading } = useAuth();

    // ユーザー情報の読み込み中はローディング画面を表示
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><p>読み込み中...</p></div>;
    }

    // ユーザーがいなければログインページへ
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // ユーザーがいれば、子要素（DashboardPageなど）を表示
    return <Outlet />;
};

// --- メインレイアウト（ヘッダーなど）のためのコンポーネント ---
// ログイン後に表示されるページの共通レイアウトです
const MainLayout: React.FC = () => (
    <div className="min-h-screen bg-light">
        <Header />
        <main>
            <Outlet />
        </main>
    </div>
);

// --- アプリケーションのメインコンポーネント ---
// ここで全体のルーティング（ページの振り分け）を定義します
const App: React.FC = () => {
    return (
        <AuthProvider>
            {/* ★ HashRouter を BrowserRouter に変更 */}
            <BrowserRouter>
                <Routes>
                    {/* ログインしていない人がアクセスするルート */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignUpPage />} />

                    {/* ログインしている人だけがアクセスできるルート */}
                    <Route element={<MainLayout />}>
                      <Route element={<ProtectedRoute />}>
                          {/* URLが "/" の時にDashboardPageを表示 */}
                          <Route path="/" element={<DashboardPage />} />
                      </Route>
                    </Route>

                    {/* それ以外のURLはすべて "/" にリダイレクト */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;