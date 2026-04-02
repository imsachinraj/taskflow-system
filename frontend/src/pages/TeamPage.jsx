// ─── TeamPage.jsx ─────────────────────────────────────────────────────────────
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Copy, RefreshCw, UserMinus, Shield } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const ROLE_COLORS = {
  owner: 'text-yellow-400 bg-yellow-400/10',
  admin: 'text-blue-400 bg-blue-400/10',
  member: 'text-green-400 bg-green-400/10',
  viewer: 'text-gray-400 bg-gray-400/10',
};

export default function TeamPage() {
  const { teamId } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamAPI.getTeam(teamId).then((r) => r.data.data),
  });

  const regenMutation = useMutation({
    mutationFn: () => teamAPI.regenerateInviteCode(teamId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team', teamId] }); toast.success('New invite code generated!'); },
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => teamAPI.removeMember(teamId, userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team', teamId] }); toast.success('Member removed'); },
  });

  if (isLoading) return <div className="p-6 text-[var(--text-muted)]">Loading team...</div>;
  if (!team) return <div className="p-6 text-[var(--text-muted)]">Team not found.</div>;

  const myRole = team.members?.find((m) => m.user?._id === user._id || m.user?.id === user._id)?.role;
  const isAdmin = ['owner', 'admin'].includes(myRole);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(team.inviteCode);
    toast.success('Invite code copied!');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{team.name}</h1>
        {team.description && <p className="text-[var(--text-secondary)] mt-1">{team.description}</p>}
      </div>

      {/* Invite code */}
      {isAdmin && (
        <div className="card p-4 mb-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Team Invite Code</h3>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-center text-xl font-mono font-bold tracking-[0.3em] text-brand-300">
              {team.inviteCode}
            </code>
            <button onClick={copyInviteCode} className="btn-secondary p-2.5" title="Copy"><Copy size={16} /></button>
            <button onClick={() => regenMutation.mutate()} className="btn-secondary p-2.5" title="Regenerate" disabled={regenMutation.isPending}>
              <RefreshCw size={16} className={regenMutation.isPending ? 'animate-spin' : ''} />
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Share this code to let others join your team.</p>
        </div>
      )}

      {/* Members */}
      <div className="card">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Members ({team.members?.length})</h3>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {team.members?.map((member) => {
            if (!member.user) return null;
            const isMe = member.user._id === user._id || member.user.id === user._id;
            return (
              <div key={member.user._id || member.user.id} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar user={member.user} size="md" showStatus />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{member.user.name}</p>
                    {isMe && <span className="text-xs text-[var(--text-muted)]">(you)</span>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx('badge text-xs', ROLE_COLORS[member.role])}>{member.role}</span>
                  {member.user.lastSeen && (
                    <span className="text-xs text-[var(--text-muted)] hidden sm:block">
                      {formatDistanceToNow(new Date(member.user.lastSeen), { addSuffix: true })}
                    </span>
                  )}
                  {isAdmin && !isMe && member.role !== 'owner' && (
                    <button
                      onClick={() => { if (confirm(`Remove ${member.user.name}?`)) removeMutation.mutate(member.user._id || member.user.id); }}
                      className="btn-ghost p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
