import { Clock, MessageSquare, Paperclip, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { AvatarGroup } from '../common/Avatar';
import clsx from 'clsx';

const PRIORITY_STYLES = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  high:     'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  low:      'text-green-400 bg-green-400/10 border-green-400/30',
};

const PRIORITY_DOT = {
  critical: 'bg-red-400',
  high:     'bg-orange-400',
  medium:   'bg-yellow-400',
  low:      'bg-green-400',
};

export default function TaskCard({ task, isDragging }) {
  const navigate = useNavigate();
  const { teamId } = useParams();

  const isOverdue = task.isOverdue || (
    task.dueDate && new Date(task.dueDate) < new Date() &&
    !['done', 'cancelled'].includes(task.status)
  );

  const subtaskProgress = task.subtaskProgress;

  return (
    <div
      onClick={() => navigate(`/teams/${teamId}/tasks/${task._id}`)}
      className={clsx(
        'card p-3.5 cursor-pointer group transition-all duration-150',
        'hover:border-brand-600/50 hover:shadow-lg hover:shadow-brand-900/20',
        isDragging && 'rotate-1 shadow-2xl opacity-90 border-brand-500/60',
        isOverdue && 'border-red-500/30'
      )}
    >
      {/* Priority + Tags */}
      <div className="flex items-center gap-2 mb-2">
        <span className={clsx('badge border text-[10px]', PRIORITY_STYLES[task.priority])}>
          <span className={clsx('w-1.5 h-1.5 rounded-full mr-1', PRIORITY_DOT[task.priority])} />
          {task.priority}
        </span>
        {task.tags?.slice(0, 2).map((tag) => (
          <span key={tag} className="badge bg-[var(--bg-hover)] text-[var(--text-muted)] text-[10px]">
            {tag}
          </span>
        ))}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-[var(--text-primary)] leading-snug mb-2.5 group-hover:text-white transition-colors line-clamp-2">
        {task.title}
      </p>

      {/* Subtask progress bar */}
      {subtaskProgress && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--text-muted)]">
              {subtaskProgress.completed}/{subtaskProgress.total} subtasks
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">{subtaskProgress.percentage}%</span>
          </div>
          <div className="h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${subtaskProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <AvatarGroup users={task.assignees || []} max={3} size="xs" />

        <div className="flex items-center gap-2.5 text-[var(--text-muted)]">
          {isOverdue && (
            <span className="flex items-center gap-1 text-red-400 text-xs">
              <AlertCircle size={11} />
              <span className="text-[10px]">overdue</span>
            </span>
          )}

          {!isOverdue && task.dueDate && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock size={11} />
              <span className="text-[10px]">
                {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
              </span>
            </span>
          )}

          {task.storyPoints && (
            <span className="text-[10px] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded font-mono text-[var(--text-muted)]">
              {task.storyPoints}pt
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
