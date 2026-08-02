import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mic2, LogOut, User as UserIcon, History, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Upload', icon: Upload, exact: true },
    { to: '/dashboard/calls', label: 'Call History', icon: History, exact: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Sticky top nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Left: brand + nav links */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
                <Mic2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">CallInsight</span>
            </Link>

            {/* Nav links */}
            <div className="hidden items-center gap-1 sm:flex">
              {navLinks.map(({ to, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === to : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: user + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <UserIcon className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">{user?.fullName}</span>
            </div>
            <button onClick={handleLogout} className="btn-secondary !px-3 !py-2 text-xs">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav links */}
        <div className="flex gap-1 border-t border-slate-100 px-4 pb-2 pt-1 sm:hidden">
          {navLinks.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">{children}</main>
    </div>
  );
}
