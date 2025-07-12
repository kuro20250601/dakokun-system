// components/PrivateRoute.tsx
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthProvider';

type PrivateRouteProps = {
  children: ReactNode;
};

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user } = useAuthContext();

  console.log('[PrivateRoute] user:', user);

  if (user === undefined) {
    // ログイン状態をまだ確認中なら、何も表示しない
    return null;
  }

  if (!user) {
    // ログインしてなければログインページへ
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
