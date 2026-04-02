import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, Users, Kanban, TrendingUp, ArrowRight } from 'lucide-react';
import { teamAPI, taskAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import Avatar, { AvatarGroup } from '../components/common/Avatar';
import clsx from 'clsx';

const PRIORITY_COLORS = {
  critical: 'text-red-400 bg-red-400/10',
  high: 'text-orange-400 bg-orange-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  low: 'text-green-400 bg-green-400/10',
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: teams = [] } = useQuery({
    queryKey: ['my-teams'],
    queryFn: () => teamAPI.getMyTeams().then((r) => r.data.data),
  });

  // Load tasks assigned to me across all teams
  const { data: myTasks = [] } = useQuery({
    queryKey: ['my-tasks', teams.map((t) => t._id).join(',')],
    queryFn: async () => {
      if (!teams.length) return [];
      const results = await Promise.all(
        teams.map((t) =>
          taskAPI.getTasks({ teamId: t._id, assignee: user._id, limit: 10 })
            .then((r) => r.data.data.map((task) => ({ ...task, teamName: t.name, teamId: t._id })))
        )
      );
      return results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    enabled: teams.length > 0,
  });

  const stats = {
    total: myTasks.length,
    inProgress: myTasks.filter((t) => t.status === 'in_progress').length,
    done: myTasks.filter((t) => t.status === 'done').length,
    overdue: myTasks.filter((t) => t.isOverdue).length,
  };

  const activeTasks = myTasks.filter((t) => !['done', 'cancelled'].includes(t.status));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">Here's what's on your plate today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'My Tasks', value: stats.total, icon: Kanban, color: 'text-brand-400 bg-brand-400/10' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-blue-400 bg-blue-400/10' },
          { label: 'Completed', value: stats.done, icon: CheckCircle2, color: 'text-green-400 bg-green-400/10' },
          { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-red-400 bg-red-400/10' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--text-muted)]">{stat.label}</span>
              <div className={clsx('p-2 rounded-lg', stat.color)}>
                <stat.icon size={16} />
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My active tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--text-primary)]">My Active Tasks</h2>
            <span className="text-xs text-[var(--text-muted)]">{activeTasks.length} tasks</span>
          </div>

          {activeTasks.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle2 size={32} className="mx-auto text-green-400 mb-3" />
              <p className="font-medium text-[var(--text-primary)]">All caught up!</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">No active tasks assigned to you.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTasks.slice(0, 6).map((task) => (
                <Link
                  key={task._id}
                  to={`/teams/${task.teamId}/tasks/${task._id}`}
                  className="card p-3.5 flex items-center gap-3 hover:border-brand-600/40 transition-colors group"
                >
                  <div className={clsx('w-1.5 h-8 rounded-full shrink-0', {
                    'bg-red-400': task.priority === 'critical',
                    'bg-orange-400': task.priority === 'high',
                    'bg-yellow-400': task.priority === 'medium',
                    'bg-green-400': task.priority === 'low',
                  })} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-white">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--text-muted)]">{task.teamName}</span>
                      {task.dueDate && (
                        <span className={clsx('text-xs', task.isOverdue ? 'text-red-400' : 'text-[var(--text-muted)]')}>
                          · Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={clsx('badge text-[10px]', PRIORITY_COLORS[task.priority])}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <ArrowRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Teams */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--text-primary)]">My Teams</h2>
            <span className="text-xs text-[var(--text-muted)]">{teams.length} teams</span>
          </div>

          {teams.length === 0 ? (
            <div className="card p-6 text-center">
              <Users size={28} className="mx-auto text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No teams yet. Create or join one!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <Link
                  key={team._id}
                  to={`/teams/${team._id}/board`}
                  className="card p-3.5 flex items-center gap-3 hover:border-brand-600/40 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {team.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{team.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{team.memberCount} members</p>
                  </div>
                  <AvatarGroup users={team.members?.map((m) => m.user).filter(Boolean) || []} max={3} size="xs" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
