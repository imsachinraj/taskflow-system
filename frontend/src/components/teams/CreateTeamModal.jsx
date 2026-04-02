import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Users, Link as LinkIcon } from 'lucide-react';
import { teamAPI } from '../../services/api';
import toast from 'react-hot-toast';

export function CreateTeamModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', isPublic: false });

  const mutation = useMutation({
    mutationFn: teamAPI.createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-teams'] });
      toast.success('Team created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create team'),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-brand-400" />
            <h2 className="font-semibold text-[var(--text-primary)]">Create a Team</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}
          className="p-5 space-y-4"
        >
          <div>
            <label className="label">Team Name *</label>
            <input
              className="input"
              placeholder="e.g. Frontend Squad"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="What does this team work on?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={form.isPublic}
              onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
              className="w-4 h-4 rounded text-brand-500"
            />
            <label htmlFor="isPublic" className="text-sm text-[var(--text-secondary)] cursor-pointer">
              Make team discoverable
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTeamModal;

export function JoinTeamModal({ onClose }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');

  const mutation = useMutation({
    mutationFn: () => teamAPI.joinTeam(code),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['my-teams'] });
      toast.success(`Joined "${data.data.name}"!`);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Invalid invite code'),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <LinkIcon size={18} className="text-brand-400" />
            <h2 className="font-semibold text-[var(--text-primary)]">Join a Team</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">Enter the invite code shared by your team admin.</p>
          <div>
            <label className="label">Invite Code</label>
            <input
              className="input font-mono tracking-widest text-center text-lg uppercase"
              placeholder="ABC12"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              className="btn-primary text-sm"
              disabled={mutation.isPending || code.length < 4}
            >
              {mutation.isPending ? 'Joining...' : 'Join Team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
