import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { userAPI } from '../services/api';
import { User, Lock, Save } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState({ name: user?.name || '', avatar: user?.avatar || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const profileMutation = useMutation({
    mutationFn: () => userAPI.updateProfile(profile),
    onSuccess: ({ data }) => { updateUser(data.data.user); toast.success('Profile updated!'); },
    onError: () => toast.error('Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: () => userAPI.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    onSuccess: () => { setPasswords({ currentPassword: '', newPassword: '', confirm: '' }); toast.success('Password changed!'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) return toast.error("Passwords don't match");
    if (passwords.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    passwordMutation.mutate();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Settings</h1>

      {/* Profile */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <User size={18} className="text-brand-400" />
          <h2 className="font-semibold text-[var(--text-primary)]">Profile</h2>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <Avatar user={{ ...user, name: profile.name }} size="xl" />
          <div>
            <p className="font-medium text-[var(--text-primary)]">{user?.name}</p>
            <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input
              className="input"
              value={profile.name}
              onChange={(e) => setProfile((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Avatar URL</label>
            <input
              className="input"
              placeholder="https://example.com/avatar.jpg"
              value={profile.avatar}
              onChange={(e) => setProfile((f) => ({ ...f, avatar: e.target.value }))}
            />
          </div>
          <button
            onClick={() => profileMutation.mutate()}
            className="btn-primary text-sm"
            disabled={profileMutation.isPending}
          >
            <Save size={14} />
            {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Lock size={18} className="text-brand-400" />
          <h2 className="font-semibold text-[var(--text-primary)]">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((f) => ({ ...f, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((f) => ({ ...f, newPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={passwords.confirm}
              onChange={(e) => setPasswords((f) => ({ ...f, confirm: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="btn-primary text-sm" disabled={passwordMutation.isPending}>
            <Lock size={14} />
            {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
