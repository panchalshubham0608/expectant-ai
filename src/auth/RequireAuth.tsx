import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

function RequireAuth() {
  const { isConfigured, isLoading, user } = useAuth();
  if (isConfigured && isLoading) return <div className="min-h-screen bg-[#faf9f6]" />;
  if (isConfigured && !user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default RequireAuth;
