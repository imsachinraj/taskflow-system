import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, Settings, LogOut, Plus, ChevronDown,
  ChevronRight, Kanban, BarChart3, Bell, Search, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { teamAPI, authAPI } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { disconnectSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';
import CreateTeamModal from '../teams/CreateTeamModal';
import JoinTeamModal from '../teams/JoinTeamModal';
import Avatar from './Avatar';
import clsx from 'clsx';

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const { joinTeam } = useSocket();

  const { data: teamsData } = useQuery({
    queryKey: ['my-teams'],
    queryFn: () => teamAPI.getMyTeams().then((r) => r.data.data),
    staleTime: 1000 * 60 * 2,
  });

  const teams = teamsData || [];

  // Auto-join socket rooms for all teams
  useEffect(() => {
    teams.forEach((team) => joinTeam(team._id));
  }, [teams, joinTeam]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (_) {}
    disconnectSocket();
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const toggleTeam = (teamId) =>
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));

  const isActive = (path) => location.pathname === path;
  const isTeamActive = (teamId) => location.pathname.includes(`/teams/${teamId}`);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          'flex flex-col h-full border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-all duration-300 z-10',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--border)] shrink-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <Kanban size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-[var(--text-primary)] text-lg tracking-tight">
              TaskFlow
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto btn-ghost p-1.5"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <Link
            to="/dashboard"
            className={clsx('sidebar-link', isActive('/dashboard') && 'active')}
          >
            <LayoutDashboard size={18} className="shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>

          {/* Teams section */}
          <div className="pt-4">
            {sidebarOpen && (
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Teams
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowJoinTeam(true)}
                    className="btn-ghost p-1 text-xs"
                    title="Join team"
                  >
                    <Search size={13} />
                  </button>
                  <button
                    onClick={() => setShowCreateTeam(true)}
                    className="btn-ghost p-1"
                    title="Create team"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            {teams.map((team) => (
              <div key={team._id}>
                <button
                  onClick={() => toggleTeam(team._id)}
                  className={clsx(
                    'sidebar-link w-full',
                    isTeamActive(team._id) && 'text-[var(--text-primary)]'
                  )}
                >
                  <div className="w-5 h-5 rounded bg-brand-600/30 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {team.name[0].toUpperCase()}
                  </div>
                  {sidebarOpen && (
                    <>
                      <span className="truncate flex-1 text-left">{team.name}</span>
                      {expandedTeams[team._id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </>
                  )}
                </button>

                {sidebarOpen && expandedTeams[team._id] && (
                  <div className="ml-8 mt-1 space-y-0.5">
                    <Link
                      to={`/teams/${team._id}/board`}
                      className={clsx('sidebar-link text-xs py-1.5', isActive(`/teams/${team._id}/board`) && 'active')}
                    >
                      <Kanban size={14} />
                      Board
                    </Link>
                    <Link
                      to={`/teams/${team._id}`}
                      className={clsx('sidebar-link text-xs py-1.5', isActive(`/teams/${team._id}`) && 'active')}
                    >
                      <Users size={14} />
                      Members
                    </Link>
                    <Link
                      to={`/teams/${team._id}/analytics`}
                      className={clsx('sidebar-link text-xs py-1.5', isActive(`/teams/${team._id}/analytics`) && 'active')}
                    >
                      <BarChart3 size={14} />
                      Analytics
                    </Link>
                  </div>
                )}
              </div>
            ))}

            {teams.length === 0 && sidebarOpen && (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-[var(--text-muted)]">No teams yet.</p>
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="text-xs text-brand-400 hover:text-brand-300 mt-1"
                >
                  Create your first team →
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-[var(--border)] shrink-0">
          <Link
            to="/settings"
            className={clsx('sidebar-link', isActive('/settings') && 'active')}
          >
            <Settings size={18} className="shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </Link>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={18} className="shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>

          {sidebarOpen && (
            <div className="flex items-center gap-2 mt-2 px-3 py-2">
              <Avatar user={user} size="sm" />
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* ── Modals ── */}
      {showCreateTeam && <CreateTeamModal onClose={() => setShowCreateTeam(false)} />}
      {showJoinTeam && <JoinTeamModal onClose={() => setShowJoinTeam(false)} />}
    </div>
  );
}
