// ─── AnalyticsPage.jsx ────────────────────────────────────────────────────────
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { taskAPI } from '../services/api';
import { BarChart3, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled' };
const STATUS_COLORS = { todo: 'bg-slate-500', in_progress: 'bg-blue-500', in_review: 'bg-yellow-500', done: 'bg-green-500', cancelled: 'bg-gray-600' };
const PRIORITY_COLORS = { low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-500' };

export default function AnalyticsPage() {
  const { teamId } = useParams();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', teamId],
    queryFn: () => taskAPI.getAnalytics(teamId).then((r) => r.data.data),
    enabled: !!teamId,
  });

  if (isLoading) return <div className="p-6 text-[var(--text-muted)]">Loading analytics...</div>;
  if (!analytics) return null;

  const totalTasks = analytics.statusBreakdown.reduce((s, x) => s + x.count, 0);
  const doneTasks = analytics.statusBreakdown.find((x) => x._id === 'done')?.count || 0;
  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Analytics</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Tasks', value: totalTasks, icon: BarChart3, color: 'text-brand-400 bg-brand-400/10' },
          { label: 'Completed', value: doneTasks, icon: CheckCircle2, color: 'text-green-400 bg-green-400/10' },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'text-blue-400 bg-blue-400/10' },
          { label: 'Overdue', value: analytics.overdueTasks, icon: AlertCircle, color: 'text-red-400 bg-red-400/10' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--text-muted)]">{stat.label}</span>
              <div className={clsx('p-2 rounded-lg', stat.color)}><stat.icon size={16} /></div>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Tasks by Status</h3>
          <div className="space-y-3">
            {analytics.statusBreakdown.map((item) => (
              <div key={item._id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-secondary)]">{STATUS_LABELS[item._id] || item._id}</span>
                  <span className="text-[var(--text-primary)] font-medium">{item.count}</span>
                </div>
                <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full', STATUS_COLORS[item._id] || 'bg-gray-500')}
                    style={{ width: totalTasks ? `${(item.count / totalTasks) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Tasks by Priority</h3>
          <div className="space-y-3">
            {['critical', 'high', 'medium', 'low'].map((priority) => {
              const item = analytics.priorityBreakdown.find((x) => x._id === priority);
              const count = item?.count || 0;
              return (
                <div key={priority}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-secondary)] capitalize">{priority}</span>
                    <span className="text-[var(--text-primary)] font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full', PRIORITY_COLORS[priority])}
                      style={{ width: totalTasks ? `${(count / totalTasks) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion trend */}
        {analytics.completionTrend?.length > 0 && (
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">Completion Trend (Last 30 Days)</h3>
            <div className="flex items-end gap-1 h-24">
              {analytics.completionTrend.map((day) => {
                const max = Math.max(...analytics.completionTrend.map((d) => d.count));
                return (
                  <div key={day._id} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[9px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.count}
                    </span>
                    <div
                      className="w-full bg-brand-500 rounded-sm transition-all hover:bg-brand-400"
                      style={{ height: `${max ? (day.count / max) * 100 : 0}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
