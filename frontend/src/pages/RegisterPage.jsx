import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Kanban, Eye, EyeOff, Check, X } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const passwordRules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Number', test: (p) => /\d/.test(p) },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const mutation = useMutation({
    mutationFn: authAPI.register,
    onSuccess: ({ data }) => {
      const { user, accessToken, refreshToken } = data.data;
      login(user, accessToken, refreshToken);
      toast.success(`Welcome to TaskFlow, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Registration failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const allRulesPassed = passwordRules.every((r) => r.test(form.password));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Kanban size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)]">TaskFlow</span>
        </div>

        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">Create an account</h1>
        <p className="text-[var(--text-secondary)] mb-8">Start managing tasks with your team</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              className="input"
              placeholder="Jane Smith"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="jane@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                placeholder="Create a strong password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                onFocus={() => setShowRules(true)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {showRules && form.password && (
              <div className="mt-2 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] space-y-1.5">
                {passwordRules.map((rule) => {
                  const passed = rule.test(form.password);
                  return (
                    <div key={rule.label} className={clsx('flex items-center gap-2 text-xs', passed ? 'text-green-400' : 'text-[var(--text-muted)]')}>
                      {passed ? <Check size={12} /> : <X size={12} />}
                      {rule.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center py-3 mt-2"
            disabled={mutation.isPending || !allRulesPassed}
          >
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
