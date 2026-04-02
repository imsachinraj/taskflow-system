import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit3, Trash2, Send, Clock, Flag, Tag, User } from 'lucide-react';
import { taskAPI, commentAPI, activityAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import Avatar, { AvatarGroup } from '../components/common/Avatar';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_OPTIONS = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const PRIORITY_COLORS = { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-green-400' };
const STATUS_COLORS = { todo: 'text-slate-400', in_progress: 'text-blue-400', in_review: 'text-yellow-400', done: 'text-green-400', cancelled: 'text-gray-500' };

export default function TaskDetailPage() {
  const { teamId, taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { on, emitTyping, emitStopTyping } = useSocket();
  const [comment, setComment] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeout = useRef(null);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskAPI.getTask(taskId).then((r) => r.data.data),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentAPI.getComments(taskId).then((r) => r.data.data),
    enabled: !!taskId,
  });

  // Real-time comment updates
  useEffect(() => {
    const unsubAdded = on('comment:added', ({ taskId: tid, comment: newComment }) => {
      if (tid !== taskId) return;
      queryClient.setQueryData(['comments', taskId], (old = []) => {
        if (old.find((c) => c._id === newComment._id)) return old;
        return [...old, newComment];
      });
    });
    const unsubTyping = on('user:typing', ({ taskId: tid, user: u }) => {
      if (tid !== taskId || u.id === user._id) return;
      setTypingUsers((prev) => prev.find((x) => x.id === u.id) ? prev : [...prev, u]);
    });
    const unsubStop = on('user:stop_typing', ({ taskId: tid, userId }) => {
      if (tid !== taskId) return;
      setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
    });
    return () => { unsubAdded?.(); unsubTyping?.(); unsubStop?.(); };
  }, [taskId, on, queryClient, user._id]);

  const updateTaskMutation = useMutation({
    mutationFn: (data) => taskAPI.updateTask(taskId, data),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(['task', taskId], data.data);
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
    },
    onError: () => toast.error('Failed to update task'),
  });

  const addCommentMutation = useMutation({
    mutationFn: () => commentAPI.addComment({ content: comment.trim(), taskId }),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => taskAPI.deleteTask(taskId),
    onSuccess: () => {
      toast.success('Task deleted');
      navigate(`/teams/${teamId}/board`);
    },
  });

  const handleCommentChange = (e) => {
    setComment(e.target.value);
    emitTyping(taskId, teamId);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitStopTyping(taskId, teamId), 1500);
  };

  if (isLoading) return <div className="p-6 text-[var(--text-muted)]">Loading task...</div>;
  if (!task) return <div className="p-6 text-[var(--text-muted)]">Task not found.</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)] shrink-0">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">{task.title}</h1>
        </div>
        <button
          onClick={() => { if (confirm('Delete this task?')) deleteTaskMutation.mutate(); }}
          className="btn-ghost p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid lg:grid-cols-3 gap-0 h-full">
          {/* Main content */}
          <div className="lg:col-span-2 p-6 border-r border-[var(--border)]">
            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Description</h3>
              {task.description ? (
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-sm text-[var(--text-muted)] italic">No description provided.</p>
              )}
            </div>

            {/* Subtasks */}
            {task.subtasks?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  Subtasks ({task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length})
                </h3>
                <div className="space-y-2">
                  {task.subtasks.map((subtask, i) => (
                    <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={subtask.isCompleted}
                        onChange={() => {
                          const newSubtasks = [...task.subtasks];
                          newSubtasks[i] = { ...subtask, isCompleted: !subtask.isCompleted };
                          updateTaskMutation.mutate({ subtasks: newSubtasks });
                        }}
                        className="w-4 h-4 rounded text-brand-500"
                      />
                      <span className={clsx('text-sm', subtask.isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]')}>
                        {subtask.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
                Comments ({comments.length})
              </h3>

              <div className="space-y-4 mb-4">
                {comments.map((c) => (
                  <div key={c._id} className="flex gap-3">
                    <Avatar user={c.author} size="sm" className="shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{c.author?.name}</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          {c.isEdited && ' (edited)'}
                        </span>
                      </div>
                      <div className={clsx('text-sm p-3 rounded-lg', c.isDeleted ? 'text-[var(--text-muted)] italic' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]')}>
                        {c.content}
                      </div>
                    </div>
                  </div>
                ))}

                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <div className="flex gap-0.5">
                      {[0,1,2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </div>
                )}
              </div>

              {/* Comment input */}
              <div className="flex gap-3">
                <Avatar user={user} size="sm" className="shrink-0 mt-1" />
                <div className="flex-1">
                  <textarea
                    className="input resize-none text-sm"
                    rows={2}
                    placeholder="Write a comment..."
                    value={comment}
                    onChange={handleCommentChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && comment.trim()) {
                        addCommentMutation.mutate();
                      }
                    }}
                  />
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-xs text-[var(--text-muted)]">Cmd+Enter to submit</span>
                    <button
                      onClick={() => addCommentMutation.mutate()}
                      disabled={!comment.trim() || addCommentMutation.isPending}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      <Send size={13} />
                      {addCommentMutation.isPending ? 'Posting...' : 'Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="p-6 space-y-5">
            {/* Status */}
            <div>
              <label className="label">Status</label>
              <select
                className={clsx('input text-sm font-medium', STATUS_COLORS[task.status])}
                value={task.status}
                onChange={(e) => updateTaskMutation.mutate({ status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="label flex items-center gap-1"><Flag size={12} /> Priority</label>
              <select
                className={clsx('input text-sm', PRIORITY_COLORS[task.priority])}
                value={task.priority}
                onChange={(e) => updateTaskMutation.mutate({ priority: e.target.value })}
              >
                {['low', 'medium', 'high', 'critical'].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Assignees */}
            <div>
              <label className="label flex items-center gap-1"><User size={12} /> Assignees</label>
              {task.assignees?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {task.assignees.map((u) => (
                    <div key={u._id} className="flex items-center gap-1.5 bg-[var(--bg-hover)] rounded-full px-2.5 py-1">
                      <Avatar user={u} size="xs" />
                      <span className="text-xs text-[var(--text-primary)]">{u.name}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-[var(--text-muted)]">Unassigned</p>}
            </div>

            {/* Due date */}
            {task.dueDate && (
              <div>
                <label className="label flex items-center gap-1"><Clock size={12} /> Due Date</label>
                <p className={clsx('text-sm', task.isOverdue ? 'text-red-400 font-medium' : 'text-[var(--text-primary)]')}>
                  {format(new Date(task.dueDate), 'MMM d, yyyy')}
                  {task.isOverdue && ' (overdue)'}
                </p>
              </div>
            )}

            {/* Tags */}
            {task.tags?.length > 0 && (
              <div>
                <label className="label flex items-center gap-1"><Tag size={12} /> Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tag) => (
                    <span key={tag} className="badge bg-brand-600/20 text-brand-300 text-xs">#{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Story points */}
            {task.storyPoints != null && (
              <div>
                <label className="label">Story Points</label>
                <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{task.storyPoints}pt</span>
              </div>
            )}

            {/* Meta */}
            <div className="pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)] space-y-1.5">
              <p>Created by <span className="text-[var(--text-secondary)]">{task.createdBy?.name}</span></p>
              <p>Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</p>
              {task.completedAt && <p>Completed {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
