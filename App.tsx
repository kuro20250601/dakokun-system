
import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Header from './components/Header';

const ProtectedRoute: React.FC = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><p>読み込み中...</p></div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

const MainLayout: React.FC = () => (
    <div className="min-h-screen bg-light">
        <Header />
        <main>
            <Outlet />
        </main>
    </div>
);


const App: React.FC = () => {
    return (
        <AuthProvider>
            <HashRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route element={<MainLayout />}>
                      <Route element={<ProtectedRoute />}>
                          <Route path="/" element={<DashboardPage />} />
                      </Route>
                    </Route>
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </HashRouter>
        </AuthProvider>
    );
};

export default App;
