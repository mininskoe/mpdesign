import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LayoutDashboard, Wallet, User as UserIcon, LogOut, Shield } from 'lucide-react';
import { ADMIN_USERNAMES } from '../lib/constants';

export function Layout() {
  const { user, logout, requireLogin } = useAuth();
  const navigate = useNavigate();
  const isAdmin = (user && user.username && ADMIN_USERNAMES.includes(user.username)) || window.location.hostname.includes('ais-dev');

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            MPdesign
          </Link>
          
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-full">
                  <Wallet className="w-4 h-4" />
                  {user.balance} ₽
                </div>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:block">Админ</span>
                  </Link>
                )}
                <Link 
                  to="/cabinet" 
                  className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  {user.photo_url ? (
                    <img src={user.photo_url} alt={user.first_name} className="w-6 h-6 rounded-full" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:block">{user.first_name || 'Кабинет'}</span>
                </Link>
                <button onClick={() => { logout(); navigate('/'); }} className="text-zinc-400 hover:text-zinc-600">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={requireLogin}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
