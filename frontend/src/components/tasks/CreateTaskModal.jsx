import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Calendar, Tag, Users, Flag } from 'lucide-react';
import { taskAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Avatar from '../common/Avatar';
import clsx from 'clsx';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'done', label: 'Done' },
];
const PRIORITY_COLORS = {
  low: 'text-green-400', medium: 'text-yellow-400',
  high: 'text-orange-400', critical: 'text-red-400',
};

export default function CreateTaskModal({ teamId, defaultStatus = 'todo', onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '', status: defaultStatus,
    priority: 'medium', dueDate: '', storyPoints: '',
    assignees: [], tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);

  const { data: searchResults } = useQuery({
    queryKey: ['user-search', userSearch, teamId],
    queryFn: () => userAPI.searchUsers(userSearch, teamId).then((r) => r.data.data),
    enabled: userSearch.length >= 2,
  });

  const mutation = useMutation({
    mutationFn: (data) => taskAPI.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      toast.success('Task created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create task'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    mutation.mutate({
      ...form,
      teamId,
      storyPoints: form.storyPoints ? parseInt(form.storyPoints) : undefined,
      dueDate: form.dueDate || undefined,
    });
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
    }
    setTagInput('');
  };

  const toggleAssignee = (user) => {
    setForm((f) => {
      const exists = f.assignees.find((a) => a._id === user._id);
      return {
        ...f,
        assignees: exists
          ? f.assignees.filter((a) => a._id !== user._id)
          : [...f.assignees, user],
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Create New Task</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Add more details..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1"><Flag size={12} /> Priority</label>
              <select
                className="input"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className={PRIORITY_COLORS[p]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date + Story points */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1"><Calendar size={12} /> Due Date</label>
              <input
                type="date"
                className="input"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Story Points</label>
              <input
                type="number"
                min={0} max={100}
                className="input"
                placeholder="0–100"
                value={form.storyPoints}
                onChange={(e) => setForm((f) => ({ ...f, storyPoints: e.target.value }))}
              />
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="label flex items-center gap-1"><Users size={12} /> Assignees</label>
            {form.assignees.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.assignees.map((user) => (
                  <div key={user._id} className="flex items-center gap-1.5 bg-[var(--bg-hover)] rounded-full pr-2 pl-1 py-0.5">
                    <Avatar user={user} size="xs" />
                    <span className="text-xs text-[var(--text-primary)]">{user.name}</span>
                    <button type="button" onClick={() => toggleAssignee(user)} className="text-[var(--text-muted)] hover:text-red-400">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                className="input text-sm"
                placeholder="Search team members..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setShowUserSearch(true); }}
                onFocus={() => setShowUserSearch(true)}
              />
              {showUserSearch && searchResults?.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 card shadow-xl z-10 max-h-40 overflow-y-auto">
                  {searchResults.map((user) => {
                    const isSelected = form.assignees.find((a) => a._id === user._id);
                    return (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => { toggleAssignee(user); setUserSearch(''); setShowUserSearch(false); }}
                        className={clsx('flex items-center gap-2 w-full px-3 py-2 hover:bg-[var(--bg-hover)] text-sm', isSelected && 'bg-brand-600/10')}
                      >
                        <Avatar user={user} size="xs" />
                        <span className="text-[var(--text-primary)]">{user.name}</span>
                        <span className="text-[var(--text-muted)] text-xs ml-auto">{user.email}</span>
                        {isSelected && <span className="text-brand-400 text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label flex items-center gap-1"><Tag size={12} /> Tags</label>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="badge bg-brand-600/20 text-brand-300 text-xs">
                    #{tag}
                    <button type="button" onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))} className="ml-1 hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              />
              <button type="button" onClick={addTag} className="btn-secondary text-sm px-3">Add</button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
